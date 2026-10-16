import axiosInstance from './axiosInstance';

/**
 * Credit Head API Service (Master Module)
 * Implements all 14 CreditHeadMaster backend operations.
 */

// 1. GET ALL
export const getAllCreditHeads = async () => {
  const response = await axiosInstance.get('/CreditHeadMaster');
  return response.data;
};

// 2. GET BY ID
export const getCreditHeadById = async (id) => {
  const response = await axiosInstance.get(`/CreditHeadMaster/${encodeURIComponent(id)}`);
  return response.data;
};

// 3. POST CREATE
export const createCreditHead = async (payload) => {
  const response = await axiosInstance.post('/CreditHeadMaster', payload);
  return response.data;
};

// 4. PUT UPDATE
export const updateCreditHead = async (id, payload) => {
  const response = await axiosInstance.put(`/CreditHeadMaster/${encodeURIComponent(id)}`, payload);
  return response.data;
};

// 5. DELETE BY ID
export const deleteCreditHead = async (id) => {
  const response = await axiosInstance.delete(`/CreditHeadMaster/${encodeURIComponent(id)}`);
  return response.data;
};

// 6. AADHAAR UPLOAD
export const uploadCreditHeadAadhaar = async (id, file, isReplace = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const method = isReplace ? 'put' : 'post';
  const action = isReplace ? 'replace-aadhar' : 'upload-aadhar';
  const response = await axiosInstance[method](
    `/CreditHeadMaster/${action}/${encodeURIComponent(id)}`,
    formData
  );
  return response.data;
};

// 7. AADHAAR REPLACE
export const replaceCreditHeadAadhaar = async (id, file) => {
  return uploadCreditHeadAadhaar(id, file, true);
};

// 8. AADHAAR VIEW / GET BLOB
export const getCreditHeadAadhaarBlob = async (id) => {
  if (!id) return null;
  const response = await axiosInstance.get(`/CreditHeadMaster/${encodeURIComponent(id)}/aadhar`, {
    responseType: 'blob',
  });
  return response.data;
};

// 9. PAN UPLOAD
export const uploadCreditHeadPan = async (id, file, isReplace = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const method = isReplace ? 'put' : 'post';
  const action = isReplace ? 'replace-pan' : 'upload-pan';
  const response = await axiosInstance[method](
    `/CreditHeadMaster/${action}/${encodeURIComponent(id)}`,
    formData
  );
  return response.data;
};

// 10. PAN REPLACE
export const replaceCreditHeadPan = async (id, file) => {
  return uploadCreditHeadPan(id, file, true);
};

// 11. PAN VIEW / GET BLOB
export const getCreditHeadPanBlob = async (id) => {
  if (!id) return null;
  const response = await axiosInstance.get(`/CreditHeadMaster/${encodeURIComponent(id)}/pan`, {
    responseType: 'blob',
  });
  return response.data;
};

// 12. PROFILE IMAGE UPLOAD
export const uploadCreditHeadProfileImage = async (id, file, isReplace = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const method = isReplace ? 'put' : 'post';
  const action = isReplace ? 'replace-profile-image' : 'upload-profile-image';
  const response = await axiosInstance[method](
    `/CreditHeadMaster/${action}/${encodeURIComponent(id)}`,
    formData
  );
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('profile-image-updated', {
          detail: { role: 'CreditHead', id, timestamp: Date.now() },
        })
      );
    } catch {
      // ignore
    }
  }
  return response.data;
};

// 13. PROFILE IMAGE REPLACE
export const replaceCreditHeadProfileImage = async (id, file) => {
  return uploadCreditHeadProfileImage(id, file, true);
};

// 14. PROFILE IMAGE VIEW / GET BLOB
export const getCreditHeadProfileImageBlob = async (id) => {
  if (!id) return null;
  const response = await axiosInstance.get(`/CreditHeadMaster/${encodeURIComponent(id)}/profile-image`, {
    responseType: 'blob',
  });
  return response.data;
};

// ID EXTRACTION HELPER
export const extractCreditHeadId = (response) => {
  if (!response) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string' && response.trim() !== '' && !Number.isNaN(Number(response))) {
    return Number(response);
  }
  return (
    response.creditHeadId ||
    response.CreditHeadId ||
    response.id ||
    response.Id ||
    response.data?.creditHeadId ||
    response.data?.CreditHeadId ||
    response.data?.id ||
    response.value?.[0]?.creditHeadId ||
    response.value?.[0]?.CreditHeadId ||
    response.value?.[0]?.id ||
    (typeof response.data === 'number' ? response.data : null) ||
    null
  );
};
