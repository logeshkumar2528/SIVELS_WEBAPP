import axiosInstance from '../axiosInstance';

export const getRateOfInterests = async () => {
  const response = await axiosInstance.get('/RateOfInterestMaster');
  return response.data;
};

export const getRateOfInterestById = async (id) => {
  const response = await axiosInstance.get(`/RateOfInterestMaster/${id}`);
  return response.data;
};

export const createRateOfInterest = async (data) => {
  const response = await axiosInstance.post('/RateOfInterestMaster', data);
  return response.data;
};

export const updateRateOfInterest = async (id, data) => {
  const response = await axiosInstance.put(`/RateOfInterestMaster/${id}`, data);
  return response.data;
};

export const deleteRateOfInterest = async (id) => {
  const response = await axiosInstance.delete(`/RateOfInterestMaster/${id}`);
  return response.data;
};
