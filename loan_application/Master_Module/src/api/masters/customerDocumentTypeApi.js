import axiosInstance from '../axiosInstance';

export const getCustomerDocumentTypes = async () => {
  const response = await axiosInstance.get('/CustomerDocumentTypeMaster');
  return response.data;
};

export const getCustomerDocumentTypeById = async (id) => {
  const response = await axiosInstance.get(`/CustomerDocumentTypeMaster/${id}`);
  return response.data;
};

export const createCustomerDocumentType = async (data) => {
  const response = await axiosInstance.post('/CustomerDocumentTypeMaster', data);
  return response.data;
};

export const updateCustomerDocumentType = async (id, data) => {
  const response = await axiosInstance.put(`/CustomerDocumentTypeMaster/${id}`, data);
  return response.data;
};

export const deleteCustomerDocumentType = async (id) => {
  const response = await axiosInstance.delete(`/CustomerDocumentTypeMaster/${id}`);
  return response.data;
};
