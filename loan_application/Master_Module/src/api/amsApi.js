import axiosInstance from './axiosInstance';

export const getAllAMS = async () => {
  const response = await axiosInstance.get('/AMSMaster');
  return response.data;
};

export const createAMS = async (payload) => {
  const response = await axiosInstance.post('/AMSMaster', payload);
  return response.data;
};

export const getAMSById = async (id) => {
  const response = await axiosInstance.get(`/AMSMaster/${id}`);
  return response.data;
};

export const getAMSDistrictsByAmsId = async (amsId) => {
  const response = await axiosInstance.get(`/AMSDistrictMapping/ams/${encodeURIComponent(amsId)}`);
  return response.data;
};

export const saveAMSDistrictMapping = async (amsId, districtIds) => {
  const ids = Array.isArray(districtIds) ? districtIds.map(Number).filter(Boolean) : [];
  if (!ids.length) return [];
  const response = await axiosInstance.post('/AMSDistrictMapping', {
    amsId: Number(amsId),
    districtIds: ids,
  });
  return response.data;
};

export const updateAMS = async (id, data) => {
  const response = await axiosInstance.put(`/AMSMaster/${id}`, data);
  return response.data;
};

export const uploadAMSPAN = async (amsId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/AMSMaster/upload-pan/${encodeURIComponent(amsId)}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const uploadAMSAadhaar = async (amsId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/AMSMaster/upload-aadhar/${encodeURIComponent(amsId)}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const uploadAMSProfile = async (amsId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post(
    `/AMSMaster/upload-profile-image/${encodeURIComponent(amsId)}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const extractAmsId = (response) => {
  if (!response) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string' && !isNaN(Number(response)) && response.trim() !== '') {
    return Number(response);
  }
  return (
    response.amsId ||
    response.AmsId ||
    response.id ||
    response.data?.amsId ||
    response.data?.AmsId ||
    response.data?.id ||
    response.value?.[0]?.amsId ||
    response.value?.[0]?.AmsId ||
    response.value?.[0]?.id ||
    (typeof response.data === 'number' ? response.data : null) ||
    null
  );
};
