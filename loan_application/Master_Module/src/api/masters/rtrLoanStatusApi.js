import axiosInstance from '../axiosInstance';

/**
 * Retrieve all RTR Loan Status master records.
 * GET /rtr-loan-status-master
 */
export const getRtrLoanStatuses = async () => {
  const response = await axiosInstance.get('/rtr-loan-status-master');
  return response.data;
};

/**
 * Retrieve a specific RTR Loan Status master record by ID.
 * GET /rtr-loan-status-master/{id}
 * @param {string|number} id
 */
export const getRtrLoanStatusById = async (id) => {
  const response = await axiosInstance.get(`/rtr-loan-status-master/${id}`);
  return response.data;
};

/**
 * Create a new RTR Loan Status master record.
 * POST /rtr-loan-status-master
 * @param {object} payload - { statusCode, statusName, isActive }
 */
export const createRtrLoanStatus = async (payload) => {
  const response = await axiosInstance.post('/rtr-loan-status-master', payload);
  return response.data;
};

/**
 * Update an existing RTR Loan Status master record.
 * PUT /rtr-loan-status-master/{id}
 * @param {string|number} id
 * @param {object} payload - { rtrLoanStatusId, statusCode, statusName, isActive }
 */
export const updateRtrLoanStatus = async (id, payload) => {
  const response = await axiosInstance.put(`/rtr-loan-status-master/${id}`, payload);
  return response.data;
};

/**
 * Delete an RTR Loan Status master record.
 * DELETE /rtr-loan-status-master/{id}
 * @param {string|number} id
 */
export const deleteRtrLoanStatus = async (id) => {
  const response = await axiosInstance.delete(`/rtr-loan-status-master/${id}`);
  return response.data;
};
