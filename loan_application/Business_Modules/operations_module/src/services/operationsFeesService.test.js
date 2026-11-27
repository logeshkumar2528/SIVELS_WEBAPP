import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../Core/src/api/axiosInstance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from '../../../../Core/src/api/axiosInstance';
import operationsFeesService, { getFeesApiErrorMessage } from './operationsFeesService';

describe('operationsFeesService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts preview and save payloads to the Fees API', async () => {
    axiosInstance.post.mockResolvedValue({ data: { header: {}, lines: [] } });
    const payload = { agentCustomerId: 98, applicationProductDetailsId: 123, lines: [] };

    await operationsFeesService.preview(payload);
    await operationsFeesService.save(payload);

    expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/OperationsFeeDetails/preview', payload);
    expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/OperationsFeeDetails/save', payload);
  });

  it('treats by-customer 404 as an empty saved-fee state', async () => {
    axiosInstance.get.mockRejectedValue({ response: { status: 404 } });

    await expect(operationsFeesService.getByCustomer(98, 123)).resolves.toBeNull();
    expect(axiosInstance.get).toHaveBeenCalledWith(
      '/OperationsFeeDetails/by-customer/98',
      { params: { applicationProductDetailsId: 123 } },
    );
  });

  it('supports retrieving a saved fee header by header ID', async () => {
    axiosInstance.get.mockResolvedValue({ data: { header: { operationsFeeHeaderId: 55 }, lines: [] } });

    await expect(operationsFeesService.getByHeaderId(55)).resolves.toEqual({ header: { operationsFeeHeaderId: 55 }, lines: [] });
    expect(axiosInstance.get).toHaveBeenCalledWith('/OperationsFeeDetails/55');
  });

  it('preserves non-404 failures and extracts both backend message casing styles', async () => {
    const error = { response: { status: 500, data: { Message: 'Backend failure' } } };
    axiosInstance.get.mockRejectedValue(error);

    await expect(operationsFeesService.getByCustomer(98, 123)).rejects.toBe(error);
    expect(getFeesApiErrorMessage(error)).toBe('Backend failure');
    expect(getFeesApiErrorMessage({ response: { data: { message: 'Validation failed' } } })).toBe('Validation failed');
  });
});
