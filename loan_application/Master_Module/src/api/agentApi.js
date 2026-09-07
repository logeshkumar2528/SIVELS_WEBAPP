import axiosInstance from './axiosInstance';

export const getAllAgents = async () => {
  const response = await axiosInstance.get('/AgentMaster');
  return response.data;
};

export const getAgentById = async (id) => {
  const response = await axiosInstance.get(`/AgentMaster/${encodeURIComponent(id)}`);
  return response.data;
};
