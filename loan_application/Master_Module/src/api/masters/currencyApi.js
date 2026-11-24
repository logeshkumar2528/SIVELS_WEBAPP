import axiosInstance from '../axiosInstance';

export const getCurrencies = async () => {
  const response = await axiosInstance.get('/CurrencyMaster');
  return response.data;
};

export const getCurrencyById = async (id) => {
  const response = await axiosInstance.get(`/CurrencyMaster/${id}`);
  return response.data;
};

export const createCurrency = async (data) => {
  const response = await axiosInstance.post('/CurrencyMaster', data);
  return response.data;
};

export const updateCurrency = async (id, data) => {
  const response = await axiosInstance.put(`/CurrencyMaster/${id}`, data);
  return response.data;
};

export const deleteCurrency = async (id) => {
  const response = await axiosInstance.delete(`/CurrencyMaster/${id}`);
  return response.data;
};
