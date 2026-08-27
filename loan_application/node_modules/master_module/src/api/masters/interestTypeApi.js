import axiosInstance from '../axiosInstance';

export const getInterestTypes = async () => {
  const response = await axiosInstance.get('/InterestTypeMaster');
  return response.data;
};

export const getInterestTypeById = async (id) => {
  const response = await axiosInstance.get(`/InterestTypeMaster/${id}`);
  return response.data;
};

export const createInterestType = async (data) => {
  const response = await axiosInstance.post('/InterestTypeMaster', data);
  return response.data;
};

export const updateInterestType = async (id, data) => {
  const response = await axiosInstance.put(`/InterestTypeMaster/${id}`, data);
  return response.data;
};

export const deleteInterestType = async (id) => {
  const response = await axiosInstance.delete(`/InterestTypeMaster/${id}`);
  return response.data;
};
