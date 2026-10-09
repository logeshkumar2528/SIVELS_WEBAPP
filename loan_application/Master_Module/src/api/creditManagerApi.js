import axiosInstance from './axiosInstance';

export const getAllCreditManagers = async () => {
  const response = await axiosInstance.get('/CreditManagerMaster');
  return response.data;
};

export const getCreditManagerById = async (id) => {
  const response = await axiosInstance.get(`/CreditManagerMaster/${encodeURIComponent(id)}`);
  return response.data;
};

export const createCreditManager = async (payload) => {
  const response = await axiosInstance.post('/CreditManagerMaster', payload);
  return response.data;
};

export const updateCreditManager = async (id, payload) => {
  const response = await axiosInstance.put(`/CreditManagerMaster/${encodeURIComponent(id)}`, payload);
  return response.data;
};

export const uploadCreditManagerAadhaar = async (id, file, isReplace = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const method = isReplace ? 'put' : 'post';
  const action = isReplace ? 'replace-aadhar' : 'upload-aadhar';
  const response = await axiosInstance[method](
    `/CreditManagerMaster/${action}/${encodeURIComponent(id)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadCreditManagerPan = async (id, file, isReplace = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const method = isReplace ? 'put' : 'post';
  const action = isReplace ? 'replace-pan' : 'upload-pan';
  const response = await axiosInstance[method](
    `/CreditManagerMaster/${action}/${encodeURIComponent(id)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadCreditManagerProfileImage = async (id, file, isReplace = false) => {
  const formData = new FormData();
  formData.append('file', file);
  const method = isReplace ? 'put' : 'post';
  const action = isReplace ? 'replace-profile-image' : 'upload-profile-image';
  const response = await axiosInstance[method](
    `/CreditManagerMaster/${action}/${encodeURIComponent(id)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('profile-image-updated', {
          detail: { role: 'CreditManager', id, timestamp: Date.now() },
        })
      );
    } catch {
      // ignore
    }
  }
  return response.data;
};

export const getCreditManagerProfileImageBlob = async (id) => {
  if (!id) return null;
  const response = await axiosInstance.get(`/CreditManagerMaster/${encodeURIComponent(id)}/profile-image`, {
    responseType: 'blob',
  });
  return response.data;
};

export const extractCreditManagerId = (response) => {
  if (!response) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string' && response.trim() !== '' && !Number.isNaN(Number(response))) {
    return Number(response);
  }
  return (
    response.creditManagerId ||
    response.CreditManagerId ||
    response.id ||
    response.Id ||
    response.data?.creditManagerId ||
    response.data?.CreditManagerId ||
    response.data?.id ||
    response.value?.[0]?.creditManagerId ||
    response.value?.[0]?.CreditManagerId ||
    response.value?.[0]?.id ||
    (typeof response.data === 'number' ? response.data : null) ||
    null
  );
};
