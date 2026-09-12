import axiosInstance from '../../../../Core/src/api/axiosInstance';

export const rmCustomerService = {
  createCustomer: async (customerData) => {
    const response = await axiosInstance.post('/RMAddCustomer', customerData);
    return response.data;
  },

  getAllCustomers: async () => {
    const response = await axiosInstance.get('/RMAddCustomer');
    return response.data;
  },

  getCustomerById: async (id) => {
    const response = await axiosInstance.get(`/RMAddCustomer/${id}`);
    return response.data;
  },

  uploadDocument: async (formData) => {
    const response = await axiosInstance.post('/RMCustomerDocument/upload', formData);
    return response.data;
  },

  getDocumentsByCustomerId: async (rmCustomerId) => {
    const response = await axiosInstance.get(`/RMCustomerDocument/bycustomer/${rmCustomerId}`);
    return response.data;
  },

  downloadDocument: async (id) => {
    const response = await axiosInstance.get(`/RMCustomerDocument/download/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  promoteRmCustomer: async (rmCustomerId, payload) => {
    const response = await axiosInstance.post(`/RMAddCustomer/${encodeURIComponent(rmCustomerId)}/promote`, payload);
    return response.data;
  },
};
