import { Injectable } from '@angular/core'
import { IMatch } from '../../matches/shared/match.interface'
import { base58decode, base58encode } from '@waves/waves-crypto'

@Injectable()
export class StorageHelper {
  constructor() {
  }

  getUser() {
    return JSON.parse(localStorage.getItem('user'))
  }

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user))
  }

  getMatches(userAddress: string): Record<string, IMatch> {
    const allMatches = JSON.parse(localStorage.getItem('matches')) || {}

    return allMatches[userAddress] || {}
  }

  setMatch(userAddress: string, match: IMatch): IMatch {
    const allMatches = JSON.parse(localStorage.getItem('matches')) || {}
    allMatches[userAddress] = allMatches[userAddress] || {}
    allMatches[userAddress][match.address] = match

    localStorage.setItem('matches', JSON.stringify(allMatches))

    return match
  }

  getMove(userAddress: string, matchAddress: string): Uint8Array {
    const allMoves = JSON.parse(localStorage.getItem('moves')) || {}
    const moves = allMoves[userAddress] || {}

    if (!moves[matchAddress]) {
      return Uint8Array.from([])
    }

    return base58decode(moves[matchAddress])
  }

  setMove(userAddress: string, matchAddress: string, move: Uint8Array): Uint8Array {
    const allMoves = JSON.parse(localStorage.getItem('moves')) || {}
    allMoves[userAddress] = allMoves[userAddress] || {}
    allMoves[userAddress][matchAddress] = base58encode(move)

    localStorage.setItem('moves', JSON.stringify(allMoves))

    return move
  }
}
