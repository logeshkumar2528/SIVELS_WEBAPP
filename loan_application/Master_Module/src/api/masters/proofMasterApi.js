import axiosInstance from '../axiosInstance';

export const getProofMasters = async () => {
  const response = await axiosInstance.get('/proofmaster');
  return response.data;
};

export const getProofMastersByDocumentType = async (documentTypeId) => {
  const response = await axiosInstance.get(`/proofmaster?documentTypeId=${encodeURIComponent(documentTypeId)}`);
  return response.data;
};

export const getProofMasterById = async (id) => {
  const response = await axiosInstance.get(`/proofmaster/${encodeURIComponent(id)}`);
  return response.data;
};

export const createProofMaster = async (data) => {
  const response = await axiosInstance.post('/proofmaster', data);
  return response.data;
};

export const updateProofMaster = async (id, data) => {
  const response = await axiosInstance.put(`/proofmaster/${encodeURIComponent(id)}`, data);
  return response.data;
};

export const deleteProofMaster = async (id) => {
  const response = await axiosInstance.delete(`/proofmaster/${encodeURIComponent(id)}`);
  return response.data;
};
