import axiosInstance from './axiosInstance';

export const getAllAgents = async () => {
  const response = await axiosInstance.get('/AgentMaster');
  return response.data;
};

export const getAgentById = async (id) => {
  const response = await axiosInstance.get(`/AgentMaster/${encodeURIComponent(id)}`);
  return response.data;
};

export const createAgent = async (payload) => {
  const response = await axiosInstance.post('/AgentMaster', payload);
  return response.data;
};

export const updateAgent = async (id, payload) => {
  const response = await axiosInstance.put(`/AgentMaster/${encodeURIComponent(id)}`, payload);
  return response.data;
};

export const uploadAgentAadhaar = async (agentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/AgentMaster/${encodeURIComponent(agentId)}/upload-aadhaar`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadAgentPan = async (agentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/AgentMaster/${encodeURIComponent(agentId)}/upload-pan`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const uploadAgentProfileImage = async (agentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.put(
    `/AgentMaster/${encodeURIComponent(agentId)}/profile-image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const getAgentProfileImageBlob = async (agentId) => {
  if (!agentId) return null;
  const response = await axiosInstance.get(`/AgentMaster/${encodeURIComponent(agentId)}/profile-image`, {
    responseType: 'blob',
  });
  return response.data;
};

export const extractAgentId = (response) => {
  if (!response) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string' && response.trim() !== '' && !Number.isNaN(Number(response))) {
    return Number(response);
  }
  return (
    response.agentId ||
    response.AgentId ||
    response.id ||
    response.Id ||
    response.data?.agentId ||
    response.data?.AgentId ||
    response.data?.id ||
    response.value?.[0]?.agentId ||
    response.value?.[0]?.AgentId ||
    response.value?.[0]?.id ||
    (typeof response.data === 'number' ? response.data : null) ||
    null
  );
};

