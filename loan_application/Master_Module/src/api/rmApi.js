import axiosInstance from './axiosInstance';

export const createRelationshipManager = (data) => axiosInstance.post('/RMMaster', data);

export const getRelationshipManager = (rmId) => axiosInstance.get(`/RMMaster/${rmId}`);

export const getAllRelationshipManagers = async () => {
  const response = await axiosInstance.get('/RMMaster');
  return response.data;
};

export const updateRelationshipManager = (rmId, data) => axiosInstance.put(`/RMMaster/${rmId}`, data);

export const uploadRMAadhaar = async (rmId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/RMMaster/upload-aadhar/${encodeURIComponent(rmId)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadRMPan = async (rmId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/RMMaster/upload-pan/${encodeURIComponent(rmId)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadRMProfileImage = async (rmId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.put(
    `/RMMaster/replace-profile-image/${encodeURIComponent(rmId)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('profile-image-updated', {
          detail: { role: 'RM', id: rmId, timestamp: Date.now() },
        })
      );
    } catch {
      // ignore
    }
  }
  return response.data;
};

export const getRMProfileImageBlob = async (rmId) => {
  if (!rmId) return null;
  const response = await axiosInstance.get(`/RMMaster/${encodeURIComponent(rmId)}/profile-image`, {
    responseType: 'blob',
  });
  return response.data;
};

export const extractRmId = (response) => {
  if (!response) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string' && response.trim() !== '' && !Number.isNaN(Number(response))) {
    return Number(response);
  }
  return (
    response.rmId ||
    response.RMId ||
    response.id ||
    response.Id ||
    response.data?.rmId ||
    response.data?.RMId ||
    response.data?.id ||
    response.value?.[0]?.rmId ||
    response.value?.[0]?.RMId ||
    response.value?.[0]?.id ||
    (typeof response.data === 'number' ? response.data : null) ||
    null
  );
};

