import axiosInstance from '../axiosInstance';

export const getPaymentMethods = async () => {
  const response = await axiosInstance.get('/PaymentMethodMaster');
  return response.data;
};

export const getPaymentMethodById = async (id) => {
  const response = await axiosInstance.get(`/PaymentMethodMaster/${id}`);
  return response.data;
};

export const createPaymentMethod = async (data) => {
  const response = await axiosInstance.post('/PaymentMethodMaster', data);
  return response.data;
};

export const updatePaymentMethod = async (id, data) => {
  const response = await axiosInstance.put(`/PaymentMethodMaster/${id}`, data);
  return response.data;
};

export const deletePaymentMethod = async (id) => {
  const response = await axiosInstance.delete(`/PaymentMethodMaster/${id}`);
  return response.data;
};
