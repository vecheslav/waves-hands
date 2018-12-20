import { Injectable } from '@angular/core'
import { randomBytes } from 'crypto'
import { address, concat, publicKey, sha256, base58decode, BASE64_STRING } from 'waves-crypto'
import { environment } from '../../environments/environment'
import { data, transfer, setScript, massTransfer } from 'waves-transactions'
import { KeeperService } from '../auth/keeper.service'
import { CoreService } from '../core/core.service'
import { compile } from '@waves/ride-js'
import { HttpClient } from '@angular/common/http'

const wave = 100000000

@Injectable({
  providedIn: 'root'
})
export class MatchesService {

  constructor(private keeper: KeeperService, private core: CoreService, private http: HttpClient) {
  }

  hideMoves(moves: number[]) {
    const salt = randomBytes(29)
    const move = concat([moves[0], moves[1], moves[2]], salt)
    const moveHash = sha256(move)

    return { salt, moveHash, move }
  }

  async createGame(moves: number[]) {
    const matchSeed = randomBytes(32).toString('hex')
    const matchAddress = address(matchSeed, environment.chainId)
    const matchPublicKey = publicKey(matchSeed)

    const p1Transfer = await this.keeper.prepareWavesTransfer(matchAddress, 1 * wave)
    const player1Key = p1Transfer.senderPublicKey

    const { salt, moveHash, move } = this.hideMoves(moves)

    await this.core.broadcastAndWait(p1Transfer)

    console.log(`Player 1 transfer completed`)

    const p1DataTx = data({
      data: [
        {
          key: 'p1MoveHash', value: moveHash
        },
        {
          key: 'matchKey', value: base58decode(matchPublicKey)
        },
        {
          key: 'player1Key', value: base58decode(player1Key)
        }
      ]
    }, matchSeed)

    await this.core.broadcastAndWait(p1DataTx)

    console.log(`Player 1 move completed`)

    const setScriptTx = prepareSetScriptTx(
      matchSeed,
      environment.serviceAddress,
      environment.chainId
    )

    await this.core.broadcastAndWait(setScriptTx)

    console.log(`Match script set, address: ${matchAddress}`)
    console.log(`Public Key: ${matchPublicKey}`)

    return { matchAddress, matchPublicKey, salt, moveHash, move }
  }

  async joinGame(matchPublicKey: string, matchAddress: string, playerSeed: string, moves: number[]) {

    const playerPublicKey = publicKey(playerSeed)
    const h = (await this.http.get<{ height: number }>(environment.apiEndpoint + 'blocks/last').toPromise()).height
    console.log(`Height is ${h}`)

    const { moveHash, move } = this.hideMoves(moves)

    const tmp = data({
      senderPublicKey: matchPublicKey, data: [
        { key: 'height', value: h },
        { key: 'p2MoveHash', value: moveHash },
        { key: 'player2Key', value: base58decode(playerPublicKey) }
      ], fee: 500000
    })

    const dataTx = await this.keeper.prepareDataTx(tmp.data, tmp.senderPublicKey, parseInt(tmp.fee.toString(), undefined))

    try {
      await this.core.broadcastAndWait(dataTx)
    } catch (error) {
      console.log(JSON.stringify(error.response.data))
    }

    console.log(`Player 2 move completed`)

    const p2Transfer = await this.keeper.prepareWavesTransfer(matchAddress, 1 * wave)

    const { id } = await this.core.broadcastAndWait(p2Transfer)

    const tmp2 = data({
      senderPublicKey: matchPublicKey, data: [
        { key: 'p2Move', value: move },
        { key: 'payment', value: base58decode(id) }
      ], fee: 500000
    }, playerSeed)

    const revealP2Move = await this.keeper.prepareDataTx(tmp2.data, tmp2.senderPublicKey, parseInt(tmp2.fee.toString(), undefined))

    try {
      await this.core.broadcastAndWait(revealP2Move)
    } catch (error) {
      console.log(JSON.stringify(error.response.data))
    }

    console.log(`Player 2 move revealed`)
  }

  async finishGame(player1Address: string, player2Address: string, matchPublicKey: string, matchAddress: string, move: Uint8Array) {
    const revealP1 = data({
      data: [
        { key: 'p1Move', value: move },
      ],
      fee: 500000,
      senderPublicKey: matchPublicKey
    })

    try {
      await this.core.broadcastAndWait(revealP1)
    } catch (error) {
      console.log(JSON.stringify(error.response.data))
    }

    const player2Move = await (this.http.get<{ value: string }>(`${environment.apiEndpoint}addresses/data/${matchAddress}/p2Move`))
      .toPromise().then(x => BASE64_STRING(x.value.slice(7)))

    const compare = (m1: number, m2: number) =>
      ((m1 === 0 && m2 === 2) ||
        (m1 === 1 && m2 === 0) ||
        (m1 === 2 && m2 === 1)) ? 1 : (m1 === m2 ? 0 : -1)

    const score = player2Move.slice(0, 3).reduce((s, p2, i) => s + compare(move[i], p2), 0)

    const left = 197400000
    const commission = 1 * wave / 200
    let payout
    if (score === 0) {
      const fee = 300000 + 400000
      payout = massTransfer({
        transfers: [
          { amount: commission, recipient: environment.serviceAddress },
          { amount: (left - fee - commission) / 2, recipient: player1Address },
          { amount: (left - fee - commission) / 2, recipient: player2Address },
        ],
        senderPublicKey: matchPublicKey,
        fee: fee
      })
    } else {
      const fee = 200000 + 400000
      const winner = score > 0 ? player1Address : player2Address
      payout = massTransfer({
        transfers: [
          { amount: commission, recipient: environment.serviceAddress },
          { amount: (left - fee - commission), recipient: winner },
        ],
        senderPublicKey: matchPublicKey,
        fee: fee
      })

      console.log('Winner: ' + winner)
    }

    try {
      await this.core.broadcastAndWait(payout)
    } catch (error) {
      console.log(JSON.stringify(error.response.data))
    }

    console.log('Payout completed')
  }
}

export const prepareSetScriptTx = (matchSeed: string, serviceAddress: string, chainId: string) => {
  const code = `

let me = tx.sender
let serviceAddress = addressFromString("${serviceAddress}")
let heightKey = "height"
let stage1 = "p2MoveHash"
let stage2 = "p2Move"
let stage3 = "p1Move"
let wave = 100000000
let gameBet = 1*wave
let serviceCommission = 200
let rock = base58'1'
let paper = base58'2'
let scissors = base58'3'

let matchKey = extract(getBinary(me, "matchKey"))
let player1Key = extract(getBinary(me, "player1Key"))

match (tx) {
    case dataTx:DataTransaction =>   
        let dataTxFeeIsOk = dataTx.fee == 500000
        let dataTxDataIsOk =
        if isDefined(getBinary(dataTx.data, stage1)) then

        let oldHeight = if(isDefined(getInteger(me, heightKey))) then extract(getInteger(me, heightKey)) else 9223372036854775807
        let canWriteP2Move = (!isDefined(getBinary(me, stage1)) || (oldHeight - height < -3))
        let isDataSizeValid = size(dataTx.data) == 3
        let isDataTxSignatureValid = sigVerify(dataTx.bodyBytes, dataTx.proofs[0], extract(getBinary(dataTx.data, "player2Key")))
        let isHeightFieldCorrect = 
        (height == extract(getInteger(dataTx.data, heightKey)) ||
        height - 1 == extract(getInteger(dataTx.data, heightKey)) ||
        height + 1 == extract(getInteger(dataTx.data, heightKey)))

        canWriteP2Move && isDataSizeValid && isDataTxSignatureValid && isHeightFieldCorrect

        else if isDefined(getBinary(dataTx.data, stage2)) then 
            !isDefined(getBinary(me, stage2)) &&
            size(dataTx.data) == 2 &&
            size(extract(getBinary(dataTx.data, stage2))) == 32 &&
            sha256(extract(getBinary(dataTx.data, stage2))) == extract(getBinary(me, stage1)) &&
            match (transactionById(extract(getBinary(dataTx.data, "payment")))) {
                case p2payment:TransferTransaction =>
                    p2payment.amount == 1*wave &&
                    p2payment.recipient == me &&
                    p2payment.senderPublicKey == extract(getBinary(me, "player2Key")) &&
                    sigVerify(p2payment.bodyBytes, p2payment.proofs[0], p2payment.senderPublicKey)
                case _ => false
              }

        else if isDefined(getBinary(dataTx.data, stage3)) then
            let isP1NotYetRevealed = !isDefined(getBinary(me, stage3))
            let isSizeValid = size(dataTx.data) == 1
            let isProofValid = size(extract(getBinary(dataTx.data, stage3))) == 32
            let isShaValid = sha256(extract(getBinary(dataTx.data, stage3))) == extract(getBinary(me, "p1MoveHash"))

            isP1NotYetRevealed && isSizeValid && isProofValid && isShaValid
        else false      

        dataTxFeeIsOk &&
        dataTxDataIsOk

    case payout:MassTransferTransaction => 
    let p1moves = take(extract(getBinary(me, stage3)), 3)
    let p2moves = take(extract(getBinary(me, stage2)), 3)
    let p1m1 = take(p1moves, 1)
    let p2m1 = take(p2moves, 1)
    let p1m2 = takeRight(take(p1moves, 2), 1)
    let p2m2 = takeRight(take(p2moves, 2), 1)
    let p1m3 = takeRight(p1moves, 1)
    let p2m3 = takeRight(p2moves, 1)
    
    let round1 = if (p1m1 == rock && p2m1 == scissors) || (p1m1 == paper && p2m1 == rock) || (p1m1 == scissors && p2m1 == paper) then +1 else if p1m1 == p2m1 then 0 else -1
    let round2 = if (p1m2 == rock && p2m2 == scissors) || (p1m2 == paper && p2m2 == rock) || (p1m2 == scissors && p2m2 == paper) then +1 else if p1m2 == p2m2 then 0 else -1
    let round3 = if (p1m3 == rock && p2m3 == scissors) || (p1m3 == paper && p2m3 == rock) || (p1m3 == scissors && p2m3 == paper) then +1 else if p1m3 == p2m3 then 0 else -1
    
    let score = round1 + round2 + round3

    let p1 = addressFromPublicKey(player1Key)
    let p2 = addressFromPublicKey(extract(getBinary(me, "player2Key")))

    let isCommissionIncluded =
        payout.transfers[0].recipient == serviceAddress &&
        payout.transfers[0].amount == gameBet / serviceCommission
    
    let protect = payout.fee <= 600000

    let isPayoutValid =     
    if(score == 0) then
        size(payout.transfers) == 3 &&
        payout.transfers[1].amount == payout.transfers[2].amount &&
        payout.transfers[1].recipient == p1 &&
        payout.transfers[2].recipient == p2
    else 
        let winner = if score > 0 then p1 else p2
        size(payout.transfers) == 2 &&
        payout.transfers[1].recipient == winner
    
    protect && isCommissionIncluded && isPayoutValid
    case _ => false  
}
  
  `
  const script = Buffer.from(compile(code).result).toString('base64')

  const tx = setScript({ script, chainId }, matchSeed)

  return tx
}
