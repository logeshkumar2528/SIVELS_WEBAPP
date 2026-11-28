import { describe, expect, it, vi } from 'vitest';
import { submitCustomerToRm } from './rmSubmission';

describe('submitCustomerToRm', () => {
  const pendingRecord = {
    status: 1,
    workflowStatusCode: 'RM_VERIFICATION_PENDING',
  };

  it('handles a 204-style empty PUT response and confirms with GET', async () => {
    const customerService = {
      updateCustomer: vi.fn().mockResolvedValue(undefined),
      getCustomerById: vi.fn().mockResolvedValue(pendingRecord),
    };

    await expect(submitCustomerToRm({ customerService, customerId: 101 })).resolves.toMatchObject({
      workflowStatusCode: 'RM_VERIFICATION_PENDING',
      legacyStatus: 1,
    });
    expect(customerService.updateCustomer).toHaveBeenCalledWith(101, { status: 1 });
    expect(customerService.getCustomerById).toHaveBeenCalledWith(101);
  });

  it('does not report success when PUT fails', async () => {
    const customerService = {
      updateCustomer: vi.fn().mockRejectedValue(new Error('PUT failed')),
      getCustomerById: vi.fn(),
    };

    await expect(submitCustomerToRm({ customerService, customerId: 101 })).rejects.toThrow('PUT failed');
    expect(customerService.getCustomerById).not.toHaveBeenCalled();
  });

  it('does not report confirmed success when the confirmation GET fails', async () => {
    const customerService = {
      updateCustomer: vi.fn().mockResolvedValue(undefined),
      getCustomerById: vi.fn().mockRejectedValue(new Error('GET failed')),
    };

    await expect(submitCustomerToRm({ customerService, customerId: 101 })).rejects.toMatchObject({
      code: 'RM_SUBMISSION_CONFIRMATION_UNAVAILABLE',
    });
  });
});
