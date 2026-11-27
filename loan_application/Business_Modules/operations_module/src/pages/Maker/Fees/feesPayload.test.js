import { describe, expect, it } from 'vitest';
import {
  buildFeesPayload,
  getManualRowsSignature,
  mapFeesResponse,
  mergeFeeMasterOptions,
  normalizeFeeId,
  normalizeGstPercentForDisplay,
  validateFeeRows,
} from './feesPayload';

describe('feesPayload', () => {
  it('normalizes UI percentage values to fractional payload values', () => {
    const payload = buildFeesPayload({
      agentCustomerId: '98',
      applicationProductDetailsId: '123',
      createdBy: '7',
      notes: 'Test',
      rows: [{
        feeId: 10,
        feeName: 'Processing Fee',
        gstTreatment: 'Exclusive',
        gstPercent: '18',
        calculatedFee: '1500000',
        actualFee: '1170000',
        feeWaiver: '',
        paidAmount: '',
        paidGst: '',
        feeScheduleMethod: 'Deduct from Disbursement',
        bpType: 'Internal',
        partnerCode: '0',
      }],
    });

    expect(payload).toEqual({
      agentCustomerId: 98,
      applicationProductDetailsId: 123,
      notes: 'Test',
      createdBy: 7,
      lines: [{
        feeId: 10,
        feeName: 'Processing Fee',
        gstTreatment: 'Exclusive',
        gstPercent: 0.18,
        calculatedFee: 1500000,
        actualFee: 1170000,
        feeWaiver: 0,
        paidAmount: 0,
        paidGst: 0,
        feeScheduleMethod: 'Deduct from Disbursement',
        bpType: 'Internal',
        partnerCode: '0',
        lineNo: 1,
      }],
    });
  });

  it('maps backend calculated fields without including them in outgoing payloads', () => {
    const response = mapFeesResponse({
      header: { totalCalculatedFee: 1500000, totalNetGst: 210600, totalTotRemaining: 1380600 },
      lines: [{
        feeId: 10,
        feeName: 'Processing Fee',
        gstTreatment: 'Exclusive',
        gstPercent: 0.18,
        calculatedFee: 1500000,
        actualFee: 1170000,
        feeWaiver: 0,
        paidAmount: 0,
        paidGst: 0,
        netFee: 1170000,
        netGst: 210600,
        totNet: 1380600,
        totPaid: 0,
        remainingFee: 1170000,
        remainingGst: 210600,
        totRemaining: 1380600,
      }],
      grossDisbursementAmount: 100000000,
      totalApplicableFeeDeduction: 2360274,
      finalNetDisbursementAmount: 97639726,
    });

    expect(response.lines[0].gstPercent).toBe('18');
    expect(response.lines[0].totalNet).toBe('1380600');
    expect(response.finalNetDisbursementAmount).toBe(97639726);
  });

  it('restores inactive saved Fee Master options without adding them to new rows', () => {
    const options = mergeFeeMasterOptions(
      [{ feeId: 1, feeName: 'Processing Fee', isActive: true }],
      [{ feeId: 9, feeName: 'Legacy Fee' }],
    );

    expect(options).toEqual([
      { feeId: 1, feeName: 'Processing Fee', isActive: true },
      { feeId: 9, feeName: 'Legacy Fee', isActive: false },
    ]);
  });

  it('validates negative values and waiver limits without restricting actual fee versus calculated fee', () => {
    const errors = validateFeeRows([{
      calculatedFee: '100',
      actualFee: '200',
      feeWaiver: '201',
      paidAmount: '-1',
      paidGst: '0',
      gstPercent: '18',
    }]);

    expect(errors[0].feeWaiver).toContain('cannot exceed');
    expect(errors[0].paidAmount).toContain('negative');
    expect(errors[0].calculatedFee).toBeUndefined();
  });

  it('uses stable manual signatures for preview freshness checks', () => {
    const first = [{ rowKey: 'a', feeId: 1, actualFee: '10', netFee: '1' }];
    const second = [{ rowKey: 'b', feeId: 1, actualFee: '10', netFee: '99' }];
    expect(getManualRowsSignature(first)).toBe(getManualRowsSignature(second));
    expect(normalizeGstPercentForDisplay(0.005)).toBe('0.5');
  });

  it('keeps backend disbursement totals and payment-validation inputs authoritative', () => {
    const response = mapFeesResponse({
      header: { totalTotPaid: 100, totalTotRemaining: 200 },
      lines: [
        { feeId: 1, feeName: 'Deductible Fee', feeScheduleMethod: 'Deduct from Disbursement', netFee: 100, netGst: 18, totRemaining: 118 },
        { feeId: 2, feeName: 'Non-deductible Fee', feeScheduleMethod: 'Manual', netFee: 50, netGst: 9, totRemaining: 59 },
      ],
      grossDisbursementAmount: 1000,
      totalApplicableFeeDeduction: 118,
      finalNetDisbursementAmount: 882,
    });

    expect(response.lines).toHaveLength(2);
    expect(response.lines[0].totalRemaining).toBe('118');
    expect(response.lines[1].feeScheduleMethod).toBe('Manual');
    expect(response.totalApplicableFeeDeduction).toBe(118);
    expect(validateFeeRows([{ feeId: 1, feeName: 'Fee', netFee: '100', netGst: '18', paidAmount: '101', paidGst: '19' }], { validateAgainstPreview: true })[0]).toEqual({
      paidAmount: 'Paid Amount cannot exceed Net Fee.',
      paidGst: 'Paid GST cannot exceed Net GST.',
    });
  });

  it('normalizes duplicate Fee Master IDs and blocks duplicate rows', () => {
    expect(normalizeFeeId('001')).toBe('1');
    expect(normalizeFeeId(1)).toBe('1');

    const errors = validateFeeRows([
      { feeId: '001', feeName: 'Application Fee' },
      { feeId: 1, feeName: 'Application Fee' },
    ]);

    expect(errors[0].feeId).toContain('Duplicate fee types');
    expect(errors[1].feeId).toContain('Duplicate fee types');
  });
});
