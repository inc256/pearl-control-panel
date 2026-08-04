import { describe, expect, it } from 'vitest';
import { calculateClientPackageTotal, summarizePackagePayments } from './clientPricing';

describe('calculateClientPackageTotal', () => {
  it('applies discount and extra amount to the package base price', () => {
    expect(calculateClientPackageTotal(1000000, 150000, 200000)).toBe(1050000);
  });

  it('does not allow the total to go below zero', () => {
    expect(calculateClientPackageTotal(50000, 100000, 0)).toBe(0);
  });
});

describe('summarizePackagePayments', () => {
  it('groups client totals and payments by package', () => {
    const result = summarizePackagePayments([
      { package_name: 'Premium', client_name: 'Alice', package_total: 1000000, paid: 400000 },
      { package_name: 'Premium', client_name: 'Bob', package_total: 900000, paid: 600000 },
      { package_name: 'Basic', client_name: 'Carol', package_total: 500000, paid: 500000 },
    ]);

    expect(result).toEqual([
      { name: 'Basic', clients: 1, totalToPay: 500000, totalPaid: 500000, balance: 0 },
      { name: 'Premium', clients: 2, totalToPay: 1900000, totalPaid: 1000000, balance: 900000 },
    ]);
  });
});
