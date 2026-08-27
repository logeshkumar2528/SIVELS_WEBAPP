import axiosInstance from '../api/axiosInstance';

export const masterService = {
  getEmploymentTypes: async () => {
    const response = await axiosInstance.get('/EmploymentType');
    return response.data;
  },

  getLoanPurposes: async () => {
    const response = await axiosInstance.get('/LoanPurposeMaster');
    return response.data;
  },

  getDocumentTypes: async () => {
    const response = await axiosInstance.get('/DocumentTypeMaster');
    return response.data;
  },

  createDocumentType: async (data) => {
    const response = await axiosInstance.post('/DocumentTypeMaster', data);
    return response.data;
  },

  updateDocumentType: async (id, data) => {
    const response = await axiosInstance.put(`/DocumentTypeMaster/${id}`, data);
    return response.data;
  },

  getEmploymentTypeDocumentMapping: async (employmentTypeId) => {
    const response = await axiosInstance.get(`/EmploymentTypeDocumentMapping/byemploymenttype/${employmentTypeId}`);
    return response.data;
  },

  getAllEmploymentTypeDocumentMappings: async () => {
    const response = await axiosInstance.get('/EmploymentTypeDocumentMapping');
    return response.data;
  },

  getEmploymentTypeDocumentMappingById: async (id) => {
    const response = await axiosInstance.get(`/EmploymentTypeDocumentMapping/${id}`);
    return response.data;
  },

  createEmploymentTypeDocumentMapping: async (data) => {
    const response = await axiosInstance.post('/EmploymentTypeDocumentMapping', data);
    return response.data;
  },

  updateEmploymentTypeDocumentMapping: async (id, data) => {
    const response = await axiosInstance.put(`/EmploymentTypeDocumentMapping/${id}`, data);
    return response.data;
  },

  deleteEmploymentTypeDocumentMapping: async (id) => {
    const response = await axiosInstance.delete(`/EmploymentTypeDocumentMapping/${id}`);
    return response.data;
  },

  getTitles: async () => {
    const response = await axiosInstance.get('/TitleMaster');
    return response.data;
  },

  getGenders: async () => {
    const response = await axiosInstance.get('/gender');
    return response.data;
  },

  getMaritalStatuses: async () => {
    const response = await axiosInstance.get('/marital-status');
    return response.data;
  },

  getCountries: async () => {
    const response = await axiosInstance.get('/Country');
    return response.data;
  },

  getStates: async () => {
    const response = await axiosInstance.get('/State');
    return response.data;
  },

  getDistricts: async () => {
    const response = await axiosInstance.get('/District');
    return response.data;
  },

  getCities: async () => {
    const response = await axiosInstance.get('/City');
    return response.data;
  }
};
