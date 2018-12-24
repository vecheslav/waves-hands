import { environment } from 'src/environments/environment'
import { compile } from '@waves/ride-js'

export const scriptCode = `

let me = tx.sender
let serviceAddress = addressFromString("${environment.serviceAddress}")
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
export const compiledScript = Buffer.from(compile(scriptCode).result).toString('base64')
