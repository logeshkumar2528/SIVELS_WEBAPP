import axiosInstance from '../axiosInstance';

export const getFOIRs = async () => {
  const response = await axiosInstance.get('/FOIRMaster');
  return response.data;
};

export const getFOIRById = async (id) => {
  const response = await axiosInstance.get(`/FOIRMaster/${id}`);
  return response.data;
};

export const createFOIR = async (data) => {
  const response = await axiosInstance.post('/FOIRMaster', data);
  return response.data;
};

export const updateFOIR = async (id, data) => {
  const response = await axiosInstance.put(`/FOIRMaster/${id}`, data);
  return response.data;
};

export const deleteFOIR = async (id) => {
  const response = await axiosInstance.delete(`/FOIRMaster/${id}`);
  return response.data;
};
