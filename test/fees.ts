export const contractAdditionalFee = 400000

export const defaultFee = {
  transfer: 100000,
  massTransfer: (count: number) => 100000 + Math.ceil(0.5 * count) * 100000,
}

export const contractFee = {
  transfer: defaultFee.transfer + contractAdditionalFee,
  massTransfer: (count: number) => defaultFee.massTransfer(count) + contractAdditionalFee,
}