import axiosInstance from '../axiosInstance';

export const getRelationships = async () => {
  const response = await axiosInstance.get('/RelationshipMaster');
  return response.data;
};

export const getRelationshipById = async (id) => {
  const response = await axiosInstance.get(`/RelationshipMaster/${id}`);
  return response.data;
};

export const createRelationship = async (data) => {
  const response = await axiosInstance.post('/RelationshipMaster', data);
  return response.data;
};

export const updateRelationship = async (id, data) => {
  const response = await axiosInstance.put(`/RelationshipMaster/${id}`, data);
  return response.data;
};

export const deleteRelationship = async (id) => {
  const response = await axiosInstance.delete(`/RelationshipMaster/${id}`);
  return response.data;
};
