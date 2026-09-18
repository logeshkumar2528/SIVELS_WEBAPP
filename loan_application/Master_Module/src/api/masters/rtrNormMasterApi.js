import axiosInstance from '../axiosInstance';

/**
 * Retrieve all RTR Norm Master policy records.
 */
export const getRTRNormMasters = async () => {
  const response = await axiosInstance.get('/rtr-norm-master');
  return response.data;
};

/**
 * Retrieve a specific RTR Norm Master record by ID.
 * @param {string|number} id
 */
export const getRTRNormMasterById = async (id) => {
  const response = await axiosInstance.get(`/rtr-norm-master/${id}`);
  return response.data;
};

/**
 * Create a new RTR Norm Master policy record.
 * @param {object} payload
 */
export const createRTRNormMaster = async (payload) => {
  const response = await axiosInstance.post('/rtr-norm-master', payload);
  return response.data;
};

/**
 * Update an existing RTR Norm Master policy record.
 * @param {string|number} id
 * @param {object} payload
 */
export const updateRTRNormMaster = async (id, payload) => {
  const response = await axiosInstance.put(`/rtr-norm-master/${id}`, payload);
  return response.data;
};
