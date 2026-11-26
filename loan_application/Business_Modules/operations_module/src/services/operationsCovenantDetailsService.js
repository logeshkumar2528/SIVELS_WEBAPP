import axiosInstance from '../../../../Core/src/api/axiosInstance';
import { normalizeUploadedFilePath, resolveFileUrl } from '../../../../Core/src/api/apiConfig';
import { getStoredUser } from '../../../../Core/src/auth/session';
import { getAccessToken } from '../../../../Core/src/auth/tokenStore';
import { getCovenantDocument } from './covenantDocumentStore';

const unwrap = (payload) => {
  if (payload == null) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return payload.data;
  if (payload?.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) return payload.value;
  if (payload?.result && typeof payload.result === 'object' && !Array.isArray(payload.result)) return payload.result;
  return payload;
};

const firstRecord = (payload) => {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
};

function messageFromData(data) {
  if (data == null) return null;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (typeof data !== 'object') return null;
  return (
    data.message ||
    data.Message ||
    data.title ||
    data.error ||
    (Array.isArray(data.errors) ? data.errors.join(' ') : null) ||
    (data.errors && typeof data.errors === 'object'
      ? Object.values(data.errors).flat().filter(Boolean).join(' ')
      : null) ||
    null
  );
}

export function getApiErrorMessage(error, fallback = 'Request failed') {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const backendMessage = data instanceof Blob ? null : messageFromData(data);

  if (status === 401) return backendMessage || 'Session expired. Please sign in again.';
  if (status === 403) return backendMessage || 'You do not have access to perform this action.';
  if (status === 404) return backendMessage || 'Record not found.';
  if (status === 400) return backendMessage || 'Validation failed. Please check your input.';
  if (status === 500) return backendMessage || 'Server error. Please try again later.';
  return backendMessage || error?.message || fallback;
}

export async function getApiErrorMessageAsync(error, fallback = 'Request failed') {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        const message = messageFromData(parsed);
        if (message) return message;
      } catch {
        if (text.trim() && !text.trim().startsWith('<')) return text.trim();
      }
    } catch {
      // fall through
    }
  }
  return getApiErrorMessage(error, fallback);
}

export function getCreatedByUserId() {
  const user = getStoredUser(['MAKER', 'CHECKER']) || getStoredUser();
  const userId = Number(user?.userId ?? user?.staffId ?? user?.id);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

function withProductQuery(applicationProductDetailsId) {
  if (applicationProductDetailsId == null || String(applicationProductDetailsId).trim() === '') return {};
  return { applicationProductDetailsId };
}

export const operationsCovenantDetailsService = {
  async listByCustomer(agentCustomerId, applicationProductDetailsId) {
    try {
      const response = await axiosInstance.get(
        `/OperationsCovenantDetails/by-customer/${encodeURIComponent(agentCustomerId)}`,
        { params: withProductQuery(applicationProductDetailsId) }
      );
      const value = unwrap(response.data);
      return Array.isArray(value) ? value : value ? [value] : [];
    } catch (error) {
      if (error?.response?.status === 404) return [];
      throw error;
    }
  },

  async getById(id) {
    const response = await axiosInstance.get(`/OperationsCovenantDetails/${encodeURIComponent(id)}`);
    return firstRecord(response.data);
  },

  async create(payload, isMultipart = false) {
    const response = await axiosInstance.post('/OperationsCovenantDetails', payload, isMultipart
      ? { headers: { Accept: 'application/json' } }
      : undefined);
    return firstRecord(response.data) || unwrap(response.data);
  },

  async update(id, payload, isMultipart = false) {
    const response = await axiosInstance.put(
      `/OperationsCovenantDetails/${encodeURIComponent(id)}`,
      payload,
      isMultipart ? { headers: { Accept: 'application/json' } } : undefined
    );
    return firstRecord(response.data) || unwrap(response.data);
  },

  async remove(id) {
    await axiosInstance.delete(`/OperationsCovenantDetails/${encodeURIComponent(id)}`);
  },

  async save(agentCustomerId, applicationProductDetailsId, body) {
    const response = await axiosInstance.post(
      `/OperationsCovenantDetails/save/${encodeURIComponent(agentCustomerId)}`,
      body,
      { params: withProductQuery(applicationProductDetailsId) }
    );
    return unwrap(response.data);
  },

  async getDisbursementBlockStatus(agentCustomerId, applicationProductDetailsId) {
    try {
      const response = await axiosInstance.get(
        `/OperationsCovenantDetails/disbursement-block-status/${encodeURIComponent(agentCustomerId)}`,
        { params: withProductQuery(applicationProductDetailsId) }
      );
      return firstRecord(response.data) || unwrap(response.data) || { isBlocked: false };
    } catch (error) {
      if (error?.response?.status === 404) return { isBlocked: false };
      throw error;
    }
  },

  async downloadFile({ covenantId, path, fileName } = {}) {
    const id = covenantId != null && String(covenantId).trim() !== ''
      ? String(covenantId).trim()
      : null;
    const relativePath = String(path || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const uploadedPath = relativePath ? normalizeUploadedFilePath(relativePath) : '';

    const readBlobMessage = async (blob) => {
      try {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text);
          return parsed.message || parsed.Message || parsed.title || text.trim() || '';
        } catch {
          return text.trim();
        }
      } catch {
        return '';
      }
    };

    const asFileResult = async (blob, contentType = '', name = fileName) => {
      const type = String(contentType || blob?.type || '');
      if (type.includes('application/json') || type.includes('text/plain') || type.includes('text/html')) {
        throw new Error((await readBlobMessage(blob)) || 'Document could not be retrieved.');
      }
      if (!blob || blob.size === 0) {
        throw new Error('Document file is empty.');
      }
      return {
        blob,
        contentType: type || 'application/pdf',
        fileName: name || 'document.pdf',
      };
    };

    const cached = await getCovenantDocument({ covenantId: id, path: relativePath || uploadedPath });
    if (cached?.blob) {
      return asFileResult(cached.blob, cached.type || cached.blob.type, cached.fileName || fileName);
    }

    if (id) {
      try {
        const response = await axiosInstance.get(
          `/OperationsCovenantDetails/${encodeURIComponent(id)}/download`,
          { responseType: 'blob' }
        );
        return await asFileResult(
          response.data,
          response.headers?.['content-type'] || '',
          fileName
        );
      } catch (error) {
        if (error?.response?.status !== 404) {
          const message = await getApiErrorMessageAsync(error, '');
          if (message) throw new Error(message);
        }
      }
    }

    const pathCandidates = [...new Set([uploadedPath, relativePath].filter(Boolean))];
    for (const candidate of pathCandidates) {
      try {
        const response = await axiosInstance.get('/ApplicationKYCDocuments/download', {
          params: { path: candidate },
          responseType: 'blob',
        });
        return await asFileResult(
          response.data,
          response.headers?.['content-type'] || '',
          fileName
        );
      } catch {
        // try next candidate / fallback
      }
    }

    if (uploadedPath) {
      try {
        const token = getAccessToken();
        const response = await fetch(resolveFileUrl(uploadedPath), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const blob = await response.blob();
        if (response.ok) {
          return await asFileResult(blob, response.headers.get('content-type') || '', fileName);
        }
      } catch {
        // fall through
      }
    }

    throw new Error(
      `Unable to download${fileName ? ` “${fileName}”` : ' document'}. `
      + 'Re-upload the file once, or ask backend to expose GET /OperationsCovenantDetails/{id}/download.'
    );
  },
};

export default operationsCovenantDetailsService;
