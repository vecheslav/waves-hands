interface Array<T> {
  firstOrUndefined(): T
}

Array.prototype.firstOrUndefined = function () {
  return this.length > 0 ? this[0] : undefined
}
