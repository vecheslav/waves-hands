interface Array<T> {
  firstOrUndefined(): T
  min(map: (item: T) => number): T
}

Array.prototype.firstOrUndefined = function () {
  return this.length > 0 ? this[0] : undefined
}

Array.prototype.min = function <T>(map: (item: T) => number) {
  let min
  let index
  for (let i = 0; i < this.length; i++) {
    const element = this[i]
    const value = map(element)
    min = Math.min(value, min || value)
    if (min === value) {
      index = i
    }
  }
  return this[index]
}
