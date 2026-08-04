import { describe, expect, it } from 'vitest';
import { calculateClientPackageTotal } from './clientPricing';

describe('calculateClientPackageTotal', () => {
  it('applies discount and extra amount to the package base price', () => {
    expect(calculateClientPackageTotal(1000000, 150000, 200000)).toBe(1050000);
  });

  it('does not allow the total to go below zero', () => {
    expect(calculateClientPackageTotal(50000, 100000, 0)).toBe(0);
  });
});
