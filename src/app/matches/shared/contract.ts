import { environment } from 'src/environments/environment'
import { compile } from '@waves/ride-js'

export const scriptCode = `
let me = tx.sender
let serviceAddress = addressFromString("${environment.serviceAddress}")
let heightKey = "height"
let player2Key = "player2Key"
let player1KeyKey = "player1Key"
let p1MoveHashKey = "p1MoveHash"
let matchKeyKey = "matchKey"
let paymentKey = "payment"
let stage1 = "p2MoveHash"
let stage2 = "p2Move"
let stage3 = "p1Move"
let wave = 100000000
let gameBet = 1 * wave
let serviceCommission = gameBet / 200
let rock = base58'1'
let paper = base58'2'
let scissors = base58'3'
let player2ReservationTimeout = 3
let player1RevealTimeout =  ${environment.creatorRevealBlocksCount}

#Extracting all required keys from predefined state (state before contract applied)
let p1MoveHash = extract(getBinary(me, p1MoveHashKey))
let matchKey = extract(getBinary(me, matchKeyKey))
let player1Key = extract(getBinary(me, player1KeyKey))

match (tx) {
    case dataTx:DataTransaction => 

    let feeValid = dataTx.fee == 500000
  
    let payloadValid = 
    #Player2 reserving match for himself
    if isDefined(getBinary(dataTx.data, stage1)) then 

    let h = extract(getInteger(dataTx.data, heightKey))

    let hasValidReservation = if(isDefined(getInteger(me, heightKey))) then height - extract(getInteger(me, heightKey)) <= player2ReservationTimeout else false
    let hasPlayer2MoveRevealed = isDefined(getBinary(me, stage2))
    let heightValid = h <= height + 1 && h >= height - 1
    let isPlayer2KeyDefined = isDefined(getBinary(dataTx.data, player2Key))
    let sizeValid = size(dataTx.data) == 3
    
    !hasValidReservation && !hasPlayer2MoveRevealed && heightValid && isPlayer2KeyDefined && sizeValid
    #Player2 revealing his moves and linking to his payment
    else if isDefined(getBinary(dataTx.data, stage2)) then

    let p2MoveHash = extract(getBinary(me, stage1))

    let player2RevealedMoves = isDefined(getBinary(me, stage2))
    let sizeValid = size(dataTx.data) == 2
    let hashValid = sha256(extract(getBinary(dataTx.data, stage2))) == p2MoveHash
    let paymentValid = match (transactionById(extract(getBinary(dataTx.data, paymentKey)))) {
        case p2payment:TransferTransaction =>
            sha256(p2payment.attachment) == p2MoveHash &&
            p2payment.amount == 1*wave &&
            p2payment.recipient == me &&
            p2payment.senderPublicKey == extract(getBinary(me, player2Key)) &&
            p2payment.senderPublicKey != player1Key &&
            !isDefined(p2payment.assetId) &&
            sigVerify(p2payment.bodyBytes, p2payment.proofs[0], p2payment.senderPublicKey)
        case _ => false
      }
    
    !player2RevealedMoves && hashValid && sizeValid && paymentValid
    #Player1 revealing his moves
    else if isDefined(getBinary(dataTx.data, stage3)) then
    
    let player1RevealedMoves = isDefined(getBinary(me, stage3))
    let sizeValid = size(dataTx.data) == 1
    let proofValid = size(extract(getBinary(dataTx.data, stage3))) == 32
    let hashValid = sha256(extract(getBinary(dataTx.data, stage3))) == extract(getBinary(me, p1MoveHashKey))

    !player1RevealedMoves && sizeValid && proofValid && hashValid
    
    else false

    feeValid && payloadValid
  
    case payout:MassTransferTransaction => 

    let isCommissionIncluded =
      payout.transfers[0].recipient == serviceAddress &&
      payout.transfers[0].amount == serviceCommission

    let feeValid =
      (payout.transferCount == 2 && payout.fee <= 600000) ||
      (payout.transferCount == 3 && payout.fee <= 700000)

    let player1RevealedMoves = isDefined(getBinary(me, stage3))    
    let waitingTooLongForPlayer1 = height - extract(getInteger(me, heightKey)) > player1RevealTimeout && !player1RevealedMoves

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
    let p2 = addressFromPublicKey(extract(getBinary(me, player2Key)))

    let payoutValid =
      (waitingTooLongForPlayer1 && payout.transfers[1].recipient == p2) ||   
      if(score == 0) then
          size(payout.transfers) == 3 &&
          payout.transfers[1].amount == payout.transfers[2].amount &&
          payout.transfers[1].recipient == p1 &&
          payout.transfers[2].recipient == p2
      else 
          size(payout.transfers) == 2 &&
          payout.transfers[1].recipient == if score > 0 then p1 else p2

    feeValid && isCommissionIncluded && payoutValid
    
    case _ => false
  }

`
export const compiledScript = Buffer.from(compile(scriptCode).result).toString('base64')
