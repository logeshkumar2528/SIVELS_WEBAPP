/**
 * creditHeadService.js
 * --------------------
 * API service layer for the Credit Head module.
 * Displayed profile values always fetch live data from `GET /CreditHeadMaster/{id}`.
 */

import axiosInstance from '../../../../Core/src/api/axiosInstance';

export function unwrapResponse(res) {
  if (res == null) return null;
  const data = res?.data !== undefined ? res.data : res;
  if (data == null) return null;
  if (data.value !== undefined) return data.value;
  if (data.data !== undefined) return data.data;
  if (data.result !== undefined) return data.result;
  return data;
}

const creditHeadService = {
  getCreditHeadProfile: async (id) => {
    if (!id) throw new Error('Credit Head ID is required');
    const response = await axiosInstance.get(`/CreditHeadMaster/${encodeURIComponent(id)}`);
    return unwrapResponse(response);
  },
};

export default creditHeadService;
