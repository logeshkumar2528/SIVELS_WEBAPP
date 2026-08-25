import axiosInstance from '../api/axiosInstance';

export const agentCustomerService = {
  createCustomer: async (customerData) => {
    const response = await axiosInstance.post('/AgentAddCustomer', customerData);
    return response.data;
  },

  uploadDocument: async (formData) => {
    const response = await axiosInstance.post('/AgentCustomerDocument/upload', formData);
    return response.data;
  },

  registerCustomer: async (customerData) => {
    const response = await axiosInstance.post('/user/register', customerData);
    return response.data;
  },

  getDocumentsByCustomerId: async (agentCustomerId) => {
    const response = await axiosInstance.get(`/AgentCustomerDocument/bycustomer/${agentCustomerId}`);
    return response.data;
  },

  downloadDocument: async (id) => {
    // For download, we need responseType blob to handle file data correctly
    const response = await axiosInstance.get(`/AgentCustomerDocument/download/${id}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};
