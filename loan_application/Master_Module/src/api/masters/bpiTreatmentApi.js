import axiosInstance from '../axiosInstance';

export const getBPITreatments = async () => {
  const response = await axiosInstance.get('/BPITreatmentMaster');
  return response.data;
};

export const getBPITreatmentById = async (id) => {
  const response = await axiosInstance.get(`/BPITreatmentMaster/${id}`);
  return response.data;
};

export const createBPITreatment = async (data) => {
  const response = await axiosInstance.post('/BPITreatmentMaster', data);
  return response.data;
};

export const updateBPITreatment = async (id, data) => {
  const response = await axiosInstance.put(`/BPITreatmentMaster/${id}`, data);
  return response.data;
};

export const deleteBPITreatment = async (id) => {
  const response = await axiosInstance.delete(`/BPITreatmentMaster/${id}`);
  return response.data;
};
