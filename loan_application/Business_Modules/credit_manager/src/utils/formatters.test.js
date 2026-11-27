import { describe, expect, it } from 'vitest';
import { formatCurrency, summarizeAmount } from './formatters';

describe('Credit Manager financial display formatters', () => {
  it('distinguishes missing, zero and numeric string amounts', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatCurrency('')).toBe('—');
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency('0')).toBe('₹0');
    expect(formatCurrency('500000')).toBe('₹5.00 L');
  });

  it('does not silently convert invalid amounts to zero', () => {
    expect(formatCurrency('invalid')).toBe('—');
    expect(summarizeAmount([{ sanctionedLoanAmount: 500000 }, { sanctionedLoanAmount: null }], 'sanctionedLoanAmount')).toEqual({
      total: null,
      complete: false,
    });
  });

  it('keeps requested and sanctioned totals independent', () => {
    const applications = [
      { expectedLoanAmount: 700000, sanctionedLoanAmount: 500000 },
      { expectedLoanAmount: '100000', sanctionedLoanAmount: '80000' },
      { expectedLoanAmount: 500000, sanctionedLoanAmount: 400000 },
    ];
    expect(summarizeAmount(applications, 'expectedLoanAmount').total).toBe(1300000);
    expect(summarizeAmount(applications, 'sanctionedLoanAmount').total).toBe(980000);
  });
});
