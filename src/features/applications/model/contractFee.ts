export const isValidContractFee = (value: string | number): boolean => {
  const fee = Number(value)
  return Number.isFinite(fee) && fee > 0
}
