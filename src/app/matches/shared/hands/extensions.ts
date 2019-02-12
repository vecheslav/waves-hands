interface Array<T> {
  toRecord(map: (item: T) => string): Record<string, T>
  firstOrUndefined(): T
  tryMapOrUndefined<TOut>(map: (item: T) => TOut): (TOut | undefined)[]
  min(map: (item: T) => number): T
  max(map: (item: T) => number): T
  minMax(map: (item: T) => number): { min: T, max: T }
  minMaxIndex(map: (item: T) => number): { min: number, max: number }
  minIndex(map: (item: T) => number): number
  maxIndex(map: (item: T) => number): number
}

Array.prototype.tryMapOrUndefined = function <T, TOut>(map: (item: T) => TOut) {
  return this.map(x => {
    try {
      return map(x)
    } catch (error) {
      return undefined
    }
  })
}

Array.prototype.toRecord = function <T>(map: (item: T) => string) {
  return this.reduce((a, b) => ({ ...a, [map(b)]: b }), {})
}

Array.prototype.firstOrUndefined = function () {
  return this.length > 0 ? this[0] : undefined
}

Array.prototype.minIndex = function <T>(map: (item: T) => number) {
  return this.minMaxIndex(map).min
}

Array.prototype.maxIndex = function <T>(map: (item: T) => number) {
  return this.minMaxIndex(map).max
}

Array.prototype.min = function <T>(map: (item: T) => number) {
  return this[this.minIndex(map)]
}

Array.prototype.minMaxIndex = function <T>(map: (item: T) => number) {
  let min
  let max
  let minIndex = 0
  let maxIndex = 0
  for (let i = 0; i < this.length; i++) {
    const element = this[i]
    const value = map(element)
    min = Math.min(value, min || value)
    max = Math.max(value, max || value)
    if (max === value) {
      maxIndex = i
    }
    if (min === value) {
      minIndex = i
    }
  }
  return { min: minIndex, max: maxIndex }
}

Array.prototype.max = function <T>(map: (item: T) => number) {
  return this[this.maxIndex(map)]
}

Array.prototype.minMax = function <T>(map: (item: T) => number) {
  const { min, max } = this.minMaxIndex(map)
  return { min: this[min], max: this[max] }
}


