import axiosInstance from '../axiosInstance';

export const getPDVerificationTypes = async () => {
  const response = await axiosInstance.get('/PDVerificationTypeMaster');
  return response.data;
};

export const getPDVerificationTypeById = async (id) => {
  const response = await axiosInstance.get(`/PDVerificationTypeMaster/${id}`);
  return response.data;
};

export const createPDVerificationType = async (data) => {
  const response = await axiosInstance.post('/PDVerificationTypeMaster', data);
  return response.data;
};

export const updatePDVerificationType = async (id, data) => {
  const response = await axiosInstance.put(`/PDVerificationTypeMaster/${id}`, data);
  return response.data;
};

export const deletePDVerificationType = async (id, modifiedBy) => {
  const url = modifiedBy 
    ? `/PDVerificationTypeMaster/${id}?modifiedBy=${encodeURIComponent(modifiedBy)}` 
    : `/PDVerificationTypeMaster/${id}`;
  const response = await axiosInstance.delete(url);
  return response.data;
};
