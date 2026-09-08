import axiosInstance from './axiosInstance';

export const createRelationshipManager = (data) => axiosInstance.post('/RMMaster', data);

export const getRelationshipManager = (rmId) => axiosInstance.get(`/RMMaster/${rmId}`);

export const getAllRelationshipManagers = async () => {
  const response = await axiosInstance.get('/RMMaster');
  return response.data;
};

export const updateRelationshipManager = (rmId, data) => axiosInstance.put(`/RMMaster/${rmId}`, data);
