import { describe, expect, it } from 'vitest';
import {
  buildOperationsKfsData,
  isOperationsKfsEligible,
  resolveMakerStaffId,
  sumOperationsKfsRepaymentRows,
} from './operationsKfsAdapter';

const application = {
  agentCustomerId: 99,
  applicationProductDetailsId: 101,
  customerCode: 'CU000099',
  loanProductName: 'Business Loan',
  operationsStatus: 'PENDING',
  assignedMakerStaffId: 44,
};

const decision = {
  decision: 'Approved',
  sanctionedLoanAmount: 200000,
  sanctionedROI: 0.12,
  sanctionedTenureMonths: 24,
};

const schedule = {
  agentCustomerId: 99,
  applicationProductDetailsId: 101,
  loanAmount: 200000,
  interestRatePa: 0.12,
  tenureMonths: 24,
  monthlyEmi: 9415,
  firstEmiDate: '2027-01-05',
  maturityDate: '2028-12-05',
  totalInterestInclBpi: 25960,
};

const details = [{ emiNo: 1, emiDate: '2027-01-05', emiAmount: 9415, principalAmount: 7415, interestAmount: 2000, closingBalance: 192585 }];
const fees = {
  header: { totalTotNet: 1000 },
  lines: [{ feeName: 'Processing Fee', totalNet: 1000 }],
  totalApplicableFeeDeduction: 1000,
  finalNetDisbursementAmount: 199000,
};

describe('operations KFS adapter', () => {
  it('uses Maker staffId and accepts only the assigned Maker with persisted data', () => {
    expect(resolveMakerStaffId({ operationsUserId: 9 }, { staffId: 44, userId: 77 })).toBe(44);
    expect(isOperationsKfsEligible({
      application,
      decision,
      schedule,
      details,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
    })).toBe(true);
    expect(isOperationsKfsEligible({
      application,
      decision,
      schedule,
      details,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 9,
    })).toBe(false);
  });

  it('preserves backend schedule values and saved fee totals', () => {
    const data = buildOperationsKfsData({
      application,
      decision,
      schedule,
      details,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
    });

    expect(data.schedule.maturityDate).toBe('2028-12-05');
    expect(data.schedule.interestRatePa).toBe(0.12);
    expect(data.fees.totalApplicableFeeDeduction).toBe(1000);
    expect(data.fees.finalNetDisbursementAmount).toBe(199000);
    expect(data.isEligible).toBe(true);
    expect(data.repaymentRows[0].rawInterestAmount).toBe(2000);
    expect(data.repaymentTotals).toEqual({ interest: 2000, principal: 7415, emi: 9415 });
    expect(data.repaymentValidation).toEqual({ valid: true, error: '' });
    expect(data.schedule.totalInterestInclBpi).toBe(25960);
    expect(data.repaymentTotals.interest).not.toBe(data.schedule.totalInterestInclBpi);
  });

  it('aggregates raw numeric repayment values across all rows without formatting-induced NaN', () => {
    const rows = [
      { emiNo: 1, interestAmount: '2,000.50', principalAmount: '7,415.25', emiAmount: '9,415.75', closingBalance: '192,584.75' },
      { emiNo: 2, interestAmount: 1000.25, principalAmount: '8,000.75', emiAmount: '9,001.00', closingBalance: 184584 },
    ];
    const data = buildOperationsKfsData({
      application,
      decision,
      schedule,
      details: rows,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
    });

    expect(data.repaymentTotals).toEqual({ interest: 3000.75, principal: 15416, emi: 18416.75 });
    expect(Number.isNaN(data.repaymentTotals.interest)).toBe(false);
    expect(Number.isNaN(data.repaymentTotals.principal)).toBe(false);
    expect(Number.isNaN(data.repaymentTotals.emi)).toBe(false);
  });

  it('preserves valid zero repayment amounts and aggregates decimal values', () => {
    const rows = [
      { emiNo: 1, interestAmount: 0, principalAmount: '0.10', emiAmount: '0.10', closingBalance: 0 },
      { emiNo: 2, interestAmount: '0.20', principalAmount: 0, emiAmount: '0.20', closingBalance: '0' },
    ];
    const data = buildOperationsKfsData({
      application,
      decision,
      schedule,
      details: rows,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
    });

    expect(data.isEligible).toBe(true);
    expect(data.repaymentTotals).toEqual({ interest: 0.2, principal: 0.1, emi: 0.3 });
    expect(sumOperationsKfsRepaymentRows(data.repaymentRows)).toEqual(data.repaymentTotals);
  });

  it('aggregates every persisted row, including rows rendered on later PDF pages', () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({
      emiNo: index + 1,
      interestAmount: index + 1,
      principalAmount: 100 + index,
      emiAmount: 101 + (index * 2),
      closingBalance: 200000 - index,
    }));
    const data = buildOperationsKfsData({
      application,
      decision,
      schedule,
      details: rows,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
    });

    expect(data.repaymentRows).toHaveLength(60);
    expect(data.repaymentTotals).toEqual({ interest: 1830, principal: 7770, emi: 9600 });
  });

  it.each([
    ['missing interest', [{ emiNo: 1, principalAmount: 10, emiAmount: 10, closingBalance: 0 }]],
    ['NaN interest', [{ emiNo: 1, interestAmount: 'NaN', principalAmount: 10, emiAmount: 10, closingBalance: 0 }]],
    ['infinite interest', [{ emiNo: 1, interestAmount: 'Infinity', principalAmount: 10, emiAmount: 10, closingBalance: 0 }]],
  ])('rejects invalid required repayment values: %s', (_label, invalidRows) => {
    const data = buildOperationsKfsData({
      application,
      decision,
      schedule,
      details: invalidRows,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
    });

    expect(data.isEligible).toBe(false);
    expect(data.repaymentTotals).toBeNull();
    expect(data.validationError).toMatch(/invalid (Interest Amount|Principal Amount|EMI Amount|Closing Balance)/);
  });

  it('blocks preview-only or invalidated data', () => {
    expect(isOperationsKfsEligible({
      application,
      decision,
      schedule: null,
      details: [],
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
    })).toBe(false);
    expect(isOperationsKfsEligible({
      application,
      decision,
      schedule,
      details,
      fees,
      agentCustomerId: 99,
      applicationProductDetailsId: 101,
      makerStaffId: 44,
      invalidated: true,
    })).toBe(false);
  });
});
