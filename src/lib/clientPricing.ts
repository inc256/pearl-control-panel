export function calculateClientPackageTotal(
  packagePrice: number,
  discount: number,
  additionalAmount: number,
) {
  const baseTotal = packagePrice - discount;
  const adjustedTotal = baseTotal + additionalAmount;
  return Math.max(adjustedTotal, 0);
}
