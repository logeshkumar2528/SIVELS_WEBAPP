import axiosInstance from '../axiosInstance';

export const getDocumentTypes = async () => {
  const response = await axiosInstance.get('/DocumentTypeMaster');
  return response.data;
};

export const getDocumentTypeById = async (id) => {
  const response = await axiosInstance.get(`/DocumentTypeMaster/${id}`);
  return response.data;
};

export const createDocumentType = async (data) => {
  const response = await axiosInstance.post('/DocumentTypeMaster', data);
  return response.data;
};

export const updateDocumentType = async (id, data) => {
  const response = await axiosInstance.put(`/DocumentTypeMaster/${id}`, data);
  return response.data;
};

export const deleteDocumentType = async (id) => {
  const response = await axiosInstance.delete(`/DocumentTypeMaster/${id}`);
  return response.data;
};
