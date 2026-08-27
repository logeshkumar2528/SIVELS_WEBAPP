import axiosInstance from '../axiosInstance';

export const getMappings = async () => {
  const response = await axiosInstance.get('/EmploymentTypeDocumentMapping');
  return response.data;
};

export const getMappingById = async (id) => {
  const response = await axiosInstance.get(`/EmploymentTypeDocumentMapping/${id}`);
  return response.data;
};

export const getMappingsByEmploymentType = async (employmentTypeId) => {
  const response = await axiosInstance.get(`/EmploymentTypeDocumentMapping/byemploymenttype/${employmentTypeId}`);
  return response.data;
};

export const createMapping = async (data) => {
  const response = await axiosInstance.post('/EmploymentTypeDocumentMapping', data);
  return response.data;
};

export const updateMapping = async (id, data) => {
  const response = await axiosInstance.put(`/EmploymentTypeDocumentMapping/${id}`, data);
  return response.data;
};

export const deleteMapping = async (id) => {
  const response = await axiosInstance.delete(`/EmploymentTypeDocumentMapping/${id}`);
  return response.data;
};
