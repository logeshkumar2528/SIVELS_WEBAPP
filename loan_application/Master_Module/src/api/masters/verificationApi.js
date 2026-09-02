import axiosInstance from '../axiosInstance';

export const getVerifications = async () => {
  const response = await axiosInstance.get('/VerificationMaster');
  return response.data;
};

export const getVerificationById = async (id) => {
  const response = await axiosInstance.get(`/VerificationMaster/${id}`);
  return response.data;
};

export const createVerification = async (data) => {
  const response = await axiosInstance.post('/VerificationMaster', data);
  return response.data;
};

export const updateVerification = async (id, data) => {
  const response = await axiosInstance.put(`/VerificationMaster/${id}`, data);
  return response.data;
};

export const deleteVerification = async (id) => {
  const response = await axiosInstance.delete(`/VerificationMaster/${id}`);
  return response.data;
};
