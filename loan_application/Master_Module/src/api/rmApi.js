import axiosInstance from './axiosInstance';

export const createRelationshipManager = (data) => axiosInstance.post('/RMMaster', data);
