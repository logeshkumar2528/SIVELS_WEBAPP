import axiosInstance from './axiosInstance';

export const createBackOffice = async (payload) => {
  const response = await axiosInstance.post('/BackOfficeMaster', payload);
  return response.data;
};

export const getAllBackOffice = async () => {
  const response = await axiosInstance.get('/BackOfficeMaster');
  return response.data;
};

export const getBackOfficeById = async (id) => {
  const response = await axiosInstance.get(`/BackOfficeMaster/${encodeURIComponent(id)}`);
  return response.data;
};

export const updateBackOffice = async (id, payload) => {
  const response = await axiosInstance.put(`/BackOfficeMaster/${encodeURIComponent(id)}`, payload);
  return response.data;
};

export const uploadBackOfficeAadhaar = async (backOfficeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/BackOfficeMaster/${encodeURIComponent(backOfficeId)}/aadhar`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadBackOfficePan = async (backOfficeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/BackOfficeMaster/${encodeURIComponent(backOfficeId)}/pan`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadBackOfficeProfileImage = async (backOfficeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/BackOfficeMaster/${encodeURIComponent(backOfficeId)}/profile-image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const getBackOfficeProfileImageBlob = async (backOfficeId) => {
  if (!backOfficeId) return null;
  const response = await axiosInstance.get(`/BackOfficeMaster/${encodeURIComponent(backOfficeId)}/profile-image`, {
    responseType: 'blob',
  });
  return response.data;
};

export const extractBackOfficeId = (response) => {
  if (!response) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string' && response.trim() !== '' && !Number.isNaN(Number(response))) {
    return Number(response);
  }
  return (
    response.backOfficeId ||
    response.BackOfficeId ||
    response.id ||
    response.Id ||
    response.data?.backOfficeId ||
    response.data?.BackOfficeId ||
    response.data?.id ||
    response.value?.[0]?.backOfficeId ||
    response.value?.[0]?.BackOfficeId ||
    response.value?.[0]?.id ||
    (typeof response.data === 'number' ? response.data : null) ||
    null
  );
};
