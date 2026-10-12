import { describe, it, expect } from 'vitest';
import {
  parseSheetNumber,
  parseSheetYesNo,
  resolveSheetColumns,
  buildNormalIncomeSummary,
  normalizeSheetGrid,
} from './normalIncomeSheetParser';

const SHEET = [
  ['Sr. No.', 'Component', '31/Mar/25', '31/Mar/26', 'Considered for Eligibility Amount'],
  ['A.1', 'PAT', ' (10,000.00)', ' (10,000.00)', ''],
  ['A.2', 'Depreciation', ' 1,000.00 ', ' 1,000.00 ', ' 1,000.00 '],
  ['A.3', 'Salary to partners', ' 1,000.00 ', ' 1,000.00 ', ''],
  ['A.4', 'Interest Paid to related parties', ' 1,000.00 ', ' 1,000.00 ', ''],
  ['A', 'Primary Income P.a. (A.1 to A.5)', ' (7,000.00)', ' (7,000.00)', ' 1,000.00 '],
  ['B', 'Salary Income (if anyone is salaried) P.a.', '', '', ''],
  ['', '', 'Other Income'],
  ['C.1', 'House Property (Per Annum)', ' 200,000.00 ', '100%', ' 200,000.00 '],
  ['C.2', 'Agriculture Income (Per Annum)', '', '50%', ' -   '],
  ['C.3', 'Income from Other Sources (Per Annum)', '', '50%', ' -   '],
  ['C.4', 'Total Other Income (B.1+ B.2+ B.3)', '', '', ' 200,000.00 '],
  ['C', 'Total Other Income to be considered', 'Restricted to maximum 100% of Business Income', 'No', ' 200,000.00 '],
  ['D', 'Total Income (A+B+C) (Per Annum)', '', '', ' 201,000.00 '],
  ['E', 'Total Eligible Monthly Income', '', '', ' 11,725.00 '],
  ['F', 'Existing Monthly Obligations', '', '', ' 5,000.00 '],
  ['G', 'Net Serviceable Income (E-F)', '', '', ' 6,725.00 '],
  ['H', 'EMI Factor @IRR/Tenor', '', '', ' 8,884.88 '],
  ['I', 'Loan Eligibility (G/H)', '', '', ' 0.76 '],
  ['J', 'Proposed Loan Amount (in lacs)', '', '', ' 1.00 '],
  ['K', 'Actual FOIR', '', '', '82.90%'],
];

describe('parseSheetNumber', () => {
  it('parses formatted sheet values', () => {
    expect(parseSheetNumber(' (10,000.00)')).toBe(-10000);
    expect(parseSheetNumber(' 1,000.00 ')).toBe(1000);
    expect(parseSheetNumber('82.90%')).toBe(82.9);
    expect(parseSheetNumber('16662.00%')).toBe(16662);
    expect(parseSheetNumber('-5,000')).toBe(-5000);
    expect(parseSheetNumber('₹2,00,000')).toBe(200000);
  });

  it('returns null for blanks, dashes and text', () => {
    expect(parseSheetNumber('')).toBeNull();
    expect(parseSheetNumber(' -   ')).toBeNull();
    expect(parseSheetNumber(undefined)).toBeNull();
    expect(parseSheetNumber('Restricted to maximum')).toBeNull();
  });
});

describe('parseSheetYesNo', () => {
  it('maps dropdown values', () => {
    expect(parseSheetYesNo('Yes')).toBe(true);
    expect(parseSheetYesNo(' No ')).toBe(false);
    expect(parseSheetYesNo('')).toBeNull();
  });
});

describe('resolveSheetColumns', () => {
  it('detects columns from the header row', () => {
    expect(resolveSheetColumns(SHEET)).toEqual({ srNo: 0, fy1: 2, fy2: 3, considered: 4 });
  });

  it('handles a shifted layout', () => {
    const shifted = SHEET.map((row) => ['', ...row]);
    expect(resolveSheetColumns(shifted)).toEqual({ srNo: 1, fy1: 3, fy2: 4, considered: 5 });
    expect(buildNormalIncomeSummary(shifted).actualFoirPercent).toBe(82.9);
  });
});

describe('buildNormalIncomeSummary', () => {
  it('maps every summary field by Sr. No.', () => {
    expect(buildNormalIncomeSummary(SHEET)).toEqual({
      patFy1: -10000,
      patFy2: -10000,
      depreciationFy1: 1000,
      depreciationFy2: 1000,
      depreciationConsidered: 1000,
      salaryToPartnersFy1: 1000,
      salaryToPartnersFy2: 1000,
      salaryToPartnersConsidered: null,
      interestToRelatedFy1: 1000,
      interestToRelatedFy2: 1000,
      interestToRelatedConsidered: null,
      primaryIncomeFy1: -7000,
      primaryIncomeFy2: -7000,
      primaryIncome: 1000,
      salaryIncomeFy1: null,
      salaryIncomeFy2: null,
      salaryIncome: null,
      housePropertyIncome: 200000,
      housePropertyFy1: 200000,
      housePropertyFy2: 100,
      agricultureIncome: null,
      agricultureFy1: null,
      agricultureFy2: 50,
      otherSourcesIncome: null,
      otherSourcesFy1: null,
      otherSourcesFy2: 50,
      totalOtherIncome: 200000,
      restrictedToBusinessIncome: false,
      totalIncomeAnnual: 201000,
      eligibleMonthlyIncome: 11725,
      existingMonthlyObligations: 5000,
      netServiceableIncome: 6725,
      emiFactor: 8884.88,
      loanEligibilityLacs: 0.76,
      proposedLoanAmountLacs: 1,
      actualFoirPercent: 82.9,
    });
  });

  it('survives inserted rows and an empty grid', () => {
    const withExtraRow = [SHEET[0], ['', 'Note row'], ...SHEET.slice(1)];
    expect(buildNormalIncomeSummary(withExtraRow).eligibleMonthlyIncome).toBe(11725);
    expect(buildNormalIncomeSummary([]).actualFoirPercent).toBeNull();
  });
});

describe('normalizeSheetGrid', () => {
  it('converts every cell to a string', () => {
    expect(normalizeSheetGrid([['A', 1, null], 'bad'])).toEqual([['A', '1', ''], []]);
  });
});
