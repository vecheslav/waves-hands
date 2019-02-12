import { compile } from '@waves/ride-js'
import { environment } from './environment'

export const scriptCode = `

let me = tx.sender
let wave = 100000000
let bet = 1 * wave
let serviceAddress = addressFromString("${environment.serviceAddress}")
let serviceCommission = bet / 200
let rock = base58'1'
let paper = base58'2'
let scissors = base58'3'
let none = throw("")
let timeout = 15

let p1MoveHash = extract(getBinary(me, "p1mh"))
let matchKey = extract(getBinary(me, "mk"))
let player1Key = extract(getBinary(me, "p1k"))

match (tx) {
    case data:DataTransaction => 

    let dataValid = 
    if isDefined(getBinary(data.data, "p2p")) then 
    
    let h = extract(getInteger(data.data, "h"))

    size(data.data) == 4 &&
    h <= height + 1 && h >= height - 1 &&
    !isDefined(getBinary(me, "p2p")) &&
    size(extract(getBinary(data.data, "p2mh"))) == 32 &&
    match(transactionById(extract(getBinary(data.data, "p2p")))) {
      case p2payment:TransferTransaction =>            
            p2payment.amount == 1 * wave &&
            p2payment.recipient == me &&
            p2payment.senderPublicKey == extract(getBinary(data.data, "p2k")) &&
            p2payment.senderPublicKey != player1Key &&
            !isDefined(p2payment.assetId)
      case _ => none
    }
    
    else if isDefined(getBinary(data.data, "p1m")) then
      let p1moves = take(extract(getBinary(data.data, "p1m")), 3)
      let p1m1 = take(p1moves, 1)
      let p1m2 = takeRight(take(p1moves, 2), 1)
      let p1m3 = takeRight(p1moves, 1)
      let err1 = p1m1 != rock && p1m1 != scissors && p1m1 != paper && p1m2 != rock && p1m2 != scissors && p1m2 != paper && p1m3 != rock && p1m3 != scissors && p1m3 != paper

      !err1 &&
      !isDefined(getBinary(me, "p1m")) &&
      size(data.data) == 1 &&
      sha256(extract(getBinary(data.data, "p1m"))) == extract(getBinary(me, "p1mh"))
    else if isDefined(getBinary(data.data, "p2m")) then
      let p2moves = take(extract(getBinary(data.data, "p2m")), 3)
      let p2m1 = take(p2moves, 1)
      let p2m2 = takeRight(take(p2moves, 2), 1)
      let p2m3 = takeRight(p2moves, 1)
      let err2 = p2m1 != rock && p2m1 != scissors && p2m1 != paper && p2m2 != rock && p2m2 != scissors && p2m2 != paper && p2m3 != rock && p2m3 != scissors && p2m3 != paper

      !err2 &&
      !isDefined(getBinary(me, "p2m")) &&
      size(data.data) == 1 &&
      sha256(extract(getBinary(data.data, "p2m"))) == extract(getBinary(me, "p2mh"))

    else if isDefined(getBinary(data.data, "w")) then

true
    else
    none

    dataValid

    case payout:MassTransferTransaction => 
    let pt = payout.transfers
    
        let h = extract(getInteger(me, "h"))
    
    let p1moves = take(extract(getBinary(me, "p1m")), 3)
    let p2moves = take(extract(getBinary(me, "p2m")), 3)
    let p1m1 = take(p1moves, 1)
    let p2m1 = take(p2moves, 1)
    let p1m2 = takeRight(take(p1moves, 2), 1)
    let p2m2 = takeRight(take(p2moves, 2), 1)
    let p1m3 = takeRight(p1moves, 1)
    let p2m3 = takeRight(p2moves, 1)

    let score = 
      (if (p1m1 == rock && p2m1 == scissors) || (p1m1 == paper && p2m1 == rock) || (p1m1 == scissors && p2m1 == paper) then +1 else if p1m1 == p2m1 then 0 else -1)
    + (if (p1m2 == rock && p2m2 == scissors) || (p1m2 == paper && p2m2 == rock) || (p1m2 == scissors && p2m2 == paper) then +1 else if p1m2 == p2m2 then 0 else -1)
    + (if (p1m3 == rock && p2m3 == scissors) || (p1m3 == paper && p2m3 == rock) || (p1m3 == scissors && p2m3 == paper) then +1 else if p1m3 == p2m3 then 0 else -1)
  
    let w = if height - h > timeout && (!isDefined(getBinary(me, "p1m")) || !isDefined(getBinary(me, "p1m"))) then
    if !isDefined(getBinary(me, "p1m")) && !isDefined(getBinary(me, "p1m")) then base58'1' else if !isDefined(getBinary(me, "p1m")) then extract(getBinary(me, "p2k")) else player1Key
    else (if score > 0 then player1Key else if score == 0 then base58'1' else extract(getBinary(me, "p2k")))

    let p1 = addressFromPublicKey(player1Key)
    let p2 = addressFromPublicKey(extract(getBinary(me, "p2k")))
    let noWinner = size(w) == 1
    let winner = if !noWinner then addressFromPublicKey(w) else p1
    let looser = if p1 == winner then p2 else p1
    let prizePool = wavesBalance(me) - serviceCommission - payout.fee
    let payoutValid =
    (pt[1].recipient == winner || throw("1")) && (pt[1].amount == (if noWinner then prizePool/2 else prizePool) || throw("3")) &&
    (pt[2].recipient == looser || throw("2")) && (pt[2].amount == (if noWinner then prizePool/2 else 0) || throw("4"))
    payout.fee == 700000 && pt[0].recipient == serviceAddress && pt[0].amount == serviceCommission && payoutValid
    case _ => false
  }

`
export const compiledScript = Buffer.from(compile(scriptCode).result!).toString('base64')

//console.log(BASE64_STRING(compiledScript).length)