import axiosInstance from "../axiosInstance";

export const getMaritalStatuses = async () => {
  const response = await axiosInstance.get("/marital-status");
  return response.data;
};

export const getMaritalStatusById = async (id) => {
  const response = await axiosInstance.get(`/marital-status/${id}`);
  return response.data;
};

export const createMaritalStatus = async (data) => {
  const response = await axiosInstance.post("/marital-status", data);
  return response.data;
};

export const updateMaritalStatus = async (id, data) => {
  const response = await axiosInstance.put(`/marital-status/${id}`, data);
  return response.data;
};

export const deleteMaritalStatus = async (id) => {
  const response = await axiosInstance.delete(`/marital-status/${id}`);
  return response.data;
};
