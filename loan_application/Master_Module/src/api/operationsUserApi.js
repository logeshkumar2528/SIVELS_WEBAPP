import axiosInstance from './axiosInstance';

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.data?.value)) return payload.data.value;
  return [];
};

const unwrapRecord = (payload) => {
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.value)) return payload.value[0] || null;
  if (Array.isArray(payload?.data?.value)) return payload.data.value[0] || null;
  return payload?.data && !Array.isArray(payload.data) ? payload.data : payload || null;
};

export const getAllOperationsUsers = async ({ roleCode } = {}) => {
  const response = await axiosInstance.get('/OperationsUsers', {
    params: roleCode ? { roleCode } : undefined,
  });
  return unwrapList(response.data);
};

export const getOperationsUserById = async (operationsUserId) => {
  const response = await axiosInstance.get(`/OperationsUsers/${encodeURIComponent(operationsUserId)}`);
  return unwrapRecord(response.data);
};

export const createOperationsUser = async (payload) => {
  const response = await axiosInstance.post('/OperationsUsers', payload);
  return response.data;
};

export const updateOperationsUser = async (operationsUserId, payload) => {
  const response = await axiosInstance.put(
    `/OperationsUsers/${encodeURIComponent(operationsUserId)}`,
    payload,
  );
  return response.data;
};

// The backend contract exposes DELETE for deactivation. The UI treats this as
// a status action and refreshes the server list after the confirmed response.
export const deactivateOperationsUser = async (operationsUserId) => {
  const response = await axiosInstance.delete(`/OperationsUsers/${encodeURIComponent(operationsUserId)}`);
  return response.data;
};

const uploadOperationsUserDocument = async (operationsUserId, documentType, file, replace = false) => {
  if (!operationsUserId || !file) throw new Error('Operations user and document file are required.');
  const formData = new FormData();
  formData.append('file', file);
  const method = replace ? 'put' : 'post';
  const response = await axiosInstance[method](
    `/OperationsUsers/${encodeURIComponent(operationsUserId)}/${documentType}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data;
};

export const uploadOperationsUserAadhaar = (operationsUserId, file, replace = false) =>
  uploadOperationsUserDocument(operationsUserId, 'aadhaar', file, replace);

export const uploadOperationsUserPan = (operationsUserId, file, replace = false) =>
  uploadOperationsUserDocument(operationsUserId, 'pan', file, replace);

export const uploadOperationsUserProfileImage = (operationsUserId, file, replace = false) =>
  uploadOperationsUserDocument(operationsUserId, 'profile-image', file, replace);

const getOperationsUserDocument = async (operationsUserId, documentType) => {
  const response = await axiosInstance.get(
    `/OperationsUsers/${encodeURIComponent(operationsUserId)}/${documentType}`,
    { responseType: 'blob' },
  );
  return response.data;
};

export const getOperationsUserAadhaarBlob = (operationsUserId) =>
  getOperationsUserDocument(operationsUserId, 'aadhaar');

export const getOperationsUserPanBlob = (operationsUserId) =>
  getOperationsUserDocument(operationsUserId, 'pan');

export const getOperationsUserProfileImageBlob = (operationsUserId) =>
  getOperationsUserDocument(operationsUserId, 'profile-image');

export const extractOperationsUserId = (response) => {
  if (!response) return null;
  if (typeof response === 'number') return response;
  if (typeof response === 'string' && response.trim() && !Number.isNaN(Number(response))) {
    return Number(response);
  }

  const record = unwrapRecord(response);
  return record?.operationsUserId
    ?? record?.OperationsUserId
    ?? record?.id
    ?? record?.Id
    ?? null;
};

export const normalizeOperationsUser = (record) => {
  const source = record || {};
  const rawActive = source.isActive ?? source.IsActive ?? source.activeStatus ?? source.ActiveStatus;
  const activeText = String(rawActive ?? '').trim().toLowerCase();
  const isActive = typeof rawActive === 'boolean'
    ? rawActive
    : typeof rawActive === 'number'
      ? rawActive !== 0
      : ['inactive', 'false', '0', 'deactivated', 'disabled'].includes(activeText)
        ? false
        : ['active', 'true', '1', 'enabled'].includes(activeText)
          ? true
          : rawActive == null || rawActive === ''
            ? true
            : Boolean(rawActive);
  return {
    ...source,
    id: source.operationsUserId ?? source.OperationsUserId ?? source.id ?? source.Id,
    operationsUserId: source.operationsUserId ?? source.OperationsUserId ?? source.id ?? source.Id,
    employeeCode: source.employeeCode ?? source.EmployeeCode ?? source.staffCode ?? source.StaffCode ?? '',
    fullName: source.fullName ?? source.FullName ?? source.name ?? source.Name ?? '',
    roleCode: source.roleCode ?? source.RoleCode ?? source.code ?? source.Code ?? '',
    roleName: source.roleName ?? source.RoleName ?? source.role ?? source.Role ?? '',
    mobileNumber: source.mobileNumber ?? source.MobileNumber ?? source.phoneNumber ?? source.PhoneNumber ?? '',
    emailAddress: source.emailAddress ?? source.EmailAddress ?? source.email ?? source.Email ?? '',
    branch: source.branch ?? source.Branch ?? source.branchName ?? source.BranchName ?? '',
    isActive,
  };
};
