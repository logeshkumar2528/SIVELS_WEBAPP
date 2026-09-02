import axiosInstance from '../axiosInstance';

export const getLoanProductCollaterals = async () => {
  const response = await axiosInstance.get('/LoanProductCollateralMaster');
  return response.data;
};

export const getLoanProductCollateralById = async (id) => {
  const response = await axiosInstance.get(`/LoanProductCollateralMaster/${id}`);
  return response.data;
};

export const createLoanProductCollateral = async (data) => {
  const response = await axiosInstance.post('/LoanProductCollateralMaster', data);
  return response.data;
};

export const updateLoanProductCollateral = async (id, data) => {
  const response = await axiosInstance.put(`/LoanProductCollateralMaster/${id}`, data);
  return response.data;
};

export const deleteLoanProductCollateral = async (id) => {
  const response = await axiosInstance.delete(`/LoanProductCollateralMaster/${id}`);
  return response.data;
};
