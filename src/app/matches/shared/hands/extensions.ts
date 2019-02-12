interface Array<T> {
  firstOrUndefined(): T
  min(map: (item: T) => number): T
  max(map: (item: T) => number): T
  minIndex(map: (item: T) => number): number
  maxIndex(map: (item: T) => number): number
}

Array.prototype.firstOrUndefined = function () {
  return this.length > 0 ? this[0] : undefined
}

Array.prototype.minIndex = function <T>(map: (item: T) => number) {
  let min
  let index = 0
  for (let i = 0; i < this.length; i++) {
    const element = this[i]
    const value = map(element)
    min = Math.min(value, min || value)
    if (min === value) {
      index = i
    }
  }
  return index
}

Array.prototype.min = function <T>(map: (item: T) => number) {
  return this[this.minIndex(map)]
}

Array.prototype.maxIndex = function <T>(map: (item: T) => number) {
  let max
  let index = 0
  for (let i = 0; i < this.length; i++) {
    const element = this[i]
    const value = map(element)
    max = Math.max(value, max || value)
    if (max === value) {
      index = i
    }
  }
  return index
}

Array.prototype.max = function <T>(map: (item: T) => number) {
  return this[this.maxIndex(map)]
}
