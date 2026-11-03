import axiosInstance from './axiosInstance';

export const createInvestor = async (payload) => (await axiosInstance.post('/InvestorsMaster', payload)).data;
export const getInvestors = async () => (await axiosInstance.get('/InvestorsMaster')).data;
export const getInvestor = async (investorId) => (await axiosInstance.get(`/InvestorsMaster/${encodeURIComponent(investorId)}`)).data;
export const updateInvestor = async (investorId, payload) => (await axiosInstance.put(`/InvestorsMaster/${encodeURIComponent(investorId)}`, payload)).data;

export const uploadInvestorFile = async (investorId, file, kind) => {
  const data = new FormData();
  data.append('file', file);
  const endpoint = kind === 'profile'
    ? `/InvestorsMaster/upload-profile-image/${encodeURIComponent(investorId)}`
    : `/InvestorsMaster/upload-${kind}/${encodeURIComponent(investorId)}`;
  return (await axiosInstance.post(endpoint, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};

export const replaceInvestorProfileImage = async (investorId, file) => {
  const data = new FormData();
  data.append('file', file);
  return (await axiosInstance.put(`/InvestorsMaster/replace-profile-image/${encodeURIComponent(investorId)}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};
