export function calculateClientPackageTotal(
  packagePrice: number,
  discount: number,
  additionalAmount: number,
) {
  const baseTotal = packagePrice - discount;
  const adjustedTotal = baseTotal + additionalAmount;
  return Math.max(adjustedTotal, 0);
}

export function resolveClientPaymentTotals({
  packageTotal,
  paidAmount,
  fallbackPaid,
  balance,
}: {
  packageTotal: number;
  paidAmount?: number | null;
  fallbackPaid?: number | null;
  balance?: number | null;
}) {
  const normalizedPackageTotal = Number(packageTotal || 0);
  const normalizedPaidAmount = Number(paidAmount || 0);
  const normalizedFallbackPaid = Number(fallbackPaid || 0);
  const derivedPaidFromBalance = typeof balance === "number"
    ? Math.max(normalizedPackageTotal - Number(balance || 0), 0)
    : 0;

  const totalPaid = Math.max(normalizedPaidAmount, normalizedFallbackPaid, derivedPaidFromBalance);
  const remainingBalance = Math.max(normalizedPackageTotal - totalPaid, 0);

  return {
    totalPaid,
    balance: remainingBalance,
  };
}

export interface PackagePaymentSummary {
  name: string;
  clients: number;
  totalToPay: number;
  totalPaid: number;
  balance: number;
}

export function summarizePackagePayments(rows: Array<{
  package_name?: string | null;
  client_name?: string | null;
  package_total: number;
  paid: number;
}>) {
  const grouped = new Map<string, PackagePaymentSummary>();

  rows.forEach((row) => {
    const name = row.package_name || 'Unassigned';
    const existing = grouped.get(name) || {
      name,
      clients: 0,
      totalToPay: 0,
      totalPaid: 0,
      balance: 0,
    };

    existing.clients += 1;
    existing.totalToPay += Number(row.package_total || 0);
    existing.totalPaid += Number(row.paid || 0);
    existing.balance = existing.totalToPay - existing.totalPaid;
    grouped.set(name, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}
