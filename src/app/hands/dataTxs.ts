import './extensions'
import { BASE64_STRING } from '@waves/marshall/dist/serializePrimitives'
import { DataTransaction } from './tx-interfaces'
import { DATA_FIELD_TYPE } from '@waves/waves-transactions/dist/transactions'

type DataType = number | string | Uint8Array | boolean

export const binary = Uint8Array.from([])
export const bool = false
export const num = 0
export const str = ''

export const toKeysAndValuesExact = <T1 extends Record<string, DataType>, T2>(dataTxs: DataTransaction[], t: T1, map: (tx: DataTransaction) => T2): (T1 & T2)[] => {

  const handleValue = (desiredType: DataType, realType: DATA_FIELD_TYPE, value: DataType) => {
    if (typeof desiredType === 'string') {
      if (realType !== DATA_FIELD_TYPE.STRING)
        throw new Error('Wrong type')
      return value.toString()
    }
    else if (typeof desiredType === 'number') {
      if (realType !== DATA_FIELD_TYPE.INTEGER)
        throw new Error('Wrong type')
      return parseInt(value.toString())
    }
    else if (typeof desiredType === 'boolean') {
      if (realType !== DATA_FIELD_TYPE.BOOLEAN)
        throw new Error('Wrong type')
      return value.toString() == 'true'
    }
    else {
      if (realType !== DATA_FIELD_TYPE.BINARY)
        throw new Error('Wrong type')
      return BASE64_STRING(value.toString())
    }
  }

  return dataTxs.tryMapOrUndefined(x => {
    const values = x.data.toRecord(k => k.key)
    const keys = {
      ...((Object.entries(t).tryMapOrUndefined(e => ({ [e[0]]: handleValue(e[1], values[e[0]].type, values[e[0]].value) }))
        .filter(x => x !== undefined)
        .reduce((a, b) => ({ ...a, ...b }), {}) as T1) as Object),
    }

    if (Object.keys(t).filter(x => !keys[x]).length > 0)
      throw new Error()

    return {
      ...(map(x) as Object),
      ...keys,
    }
  }).filter(x => x !== undefined) as (T1 & T2)[]
}