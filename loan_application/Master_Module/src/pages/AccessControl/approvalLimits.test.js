import { describe, expect, it } from 'vitest';
import { formatApprovalRange, isCreditRole, parseAmount, validateApprovalLimits } from './approvalLimits';

describe('approvalLimits', () => {
  it('treats only Credit Manager and Credit Head based roles as credit roles', () => {
    expect(isCreditRole('CREDIT_MANAGER')).toBe(true);
    expect(isCreditRole('credit_head')).toBe(true);
    expect(isCreditRole('RM')).toBe(false);
    expect(isCreditRole(null)).toBe(false);
  });

  it('formats the range with the escalation role', () => {
    expect(formatApprovalRange(0, 750000, 'Credit Head')).toBe('₹0 – ₹7,50,000 → Credit Head');
    expect(formatApprovalRange(null, null, 'Credit Head')).toBe('₹0 – no limit → Credit Head');
    expect(formatApprovalRange(100000, null, null)).toBe('₹1,00,000 – no limit');
    expect(formatApprovalRange(null, null, null)).toBeNull();
  });

  it('parses empty input as null', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('  ')).toBeNull();
    expect(parseAmount('500000')).toBe(500000);
    expect(Number.isNaN(parseAmount('abc'))).toBe(true);
  });

  it('applies the backend range rules', () => {
    expect(validateApprovalLimits({ minimum: null, maximum: null })).toBeNull();
    expect(validateApprovalLimits({ minimum: 0, maximum: 500000 })).toBeNull();
    expect(validateApprovalLimits({ minimum: -1, maximum: null })).toBe("Approval amounts can't be negative.");
    expect(validateApprovalLimits({ minimum: 600000, maximum: 500000 })).toBe(
      "The minimum approval amount can't be above the maximum."
    );
    expect(validateApprovalLimits({ minimum: NaN, maximum: null })).toBe('Approval amounts must be numbers.');
  });
});
