import axiosInstance from '../axiosInstance';

const unwrap = (response) => {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getMasterRecords = async (endpoint) => unwrap(await axiosInstance.get(endpoint));

export const getDeviationMasters = () => getMasterRecords('/DeviationMaster');
export const getCIRDeviationMasters = () => getMasterRecords('/CIRDeviationMaster');
export const getNegativeFIDeviationMasters = () => getMasterRecords('/NegativeFIDeviationMaster');

const service = (endpoint) => ({
  create: async (payload) => (await axiosInstance.post(endpoint, payload)).data,
  update: async (id, payload) => (await axiosInstance.put(`${endpoint}/${id}`, payload)).data,
  remove: async (id) => (await axiosInstance.delete(`${endpoint}/${id}`)).data,
});

export const deviationMasterApi = {
  general: service('/DeviationMaster'),
  cir: service('/CIRDeviationMaster'),
  negativeFi: service('/NegativeFIDeviationMaster'),
};
