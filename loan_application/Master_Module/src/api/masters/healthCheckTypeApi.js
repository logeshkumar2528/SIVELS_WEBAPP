import axiosInstance from '../axiosInstance';

/**
 * Retrieve all Health Check Type master records.
 */
export const getHealthCheckTypes = async () => {
  const response = await axiosInstance.get('/health-check-types');
  return response.data;
};

/**
 * Retrieve a specific Health Check Type by ID.
 * @param {string|number} id
 */
export const getHealthCheckTypeById = async (id) => {
  const response = await axiosInstance.get(`/health-check-types/${id}`);
  return response.data;
};

/**
 * Create a new Health Check Type record.
 * @param {object} payload - { checkName, isActive, createdBy }
 */
export const createHealthCheckType = async (payload) => {
  const response = await axiosInstance.post('/health-check-types', payload);
  return response.data;
};

/**
 * Update an existing Health Check Type record.
 * @param {string|number} id
 * @param {object} payload - { checkName, isActive, createdBy, modifiedBy }
 */
export const updateHealthCheckType = async (id, payload) => {
  const response = await axiosInstance.put(`/health-check-types/${id}`, payload);
  return response.data;
};

/**
 * Soft delete a Health Check Type record.
 * @param {string|number} id
 */
export const deleteHealthCheckType = async (id) => {
  const response = await axiosInstance.delete(`/health-check-types/${id}`);
  return response.data;
};
