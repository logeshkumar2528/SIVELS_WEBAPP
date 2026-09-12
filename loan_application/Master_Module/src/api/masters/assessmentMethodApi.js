import axiosInstance from '../axiosInstance';

export const getAssessmentMethods = async () => {
  const response = await axiosInstance.get('/AssessmentMethodMaster');
  return response.data;
};

export const getAssessmentMethodById = async (id) => {
  const response = await axiosInstance.get(`/AssessmentMethodMaster/${id}`);
  return response.data;
};

export const createAssessmentMethod = async (data) => {
  const response = await axiosInstance.post('/AssessmentMethodMaster', data);
  return response.data;
};

export const updateAssessmentMethod = async (id, data) => {
  const response = await axiosInstance.put(`/AssessmentMethodMaster/${id}`, data);
  return response.data;
};

export const deleteAssessmentMethod = async (id, modifiedBy = 1) => {
  const response = await axiosInstance.delete(`/AssessmentMethodMaster/${id}?modifiedBy=${encodeURIComponent(modifiedBy)}`);
  return response.data;
};
