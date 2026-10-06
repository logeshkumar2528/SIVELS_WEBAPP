import axiosInstance from '../api/axiosInstance';

/*
 * Customer document flow (new):
 *   EmploymentTypeMaster -> EmploymentTypeDocumentMapping (CustomerDocumentTypeId)
 *   -> CustomerDocumentTypeMaster -> AgentCustomerDocument -> BackOfficeDocumentRejection
 *
 * Additional applicant / co-applicant proofs stay on the separate
 *   DocumentTypeMaster -> ProofMaster -> CustomerDocumentProof flow.
 */

export const DOCUMENT_SOURCE = {
  CUSTOMER_PAGE: 'AgentCustomerDocument',
  PROOF: 'CustomerDocumentProof',
};

export const REJECTION_STATUS = {
  RETURNED: 'ReturnedToRM',
  RESUBMITTED: 'Resubmitted',
  VERIFIED: 'Verified',
};

export function pick(row, ...keys) {
  if (!row || typeof row !== 'object') return undefined;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

export function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

export function sameId(a, b) {
  return hasValue(a) && hasValue(b) && String(a) === String(b);
}

export function toList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  return data.data || data.value || data.items || data.result || [];
}

function isActiveFlag(row) {
  return pick(row, 'isActive', 'IsActive') !== false;
}

function fileNameFromPath(path) {
  return path ? String(path).replace(/\\/g, '/').split('/').pop() : '';
}

function toTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/* ==========================================
   NORMALIZERS
========================================== */

export function normalizeCustomerDocumentType(row) {
  return {
    customerDocumentTypeId: pick(row, 'customerDocumentTypeId', 'CustomerDocumentTypeId'),
    documentTypeCode: pick(row, 'documentTypeCode', 'DocumentTypeCode') || '',
    documentTypeName: pick(row, 'documentTypeName', 'DocumentTypeName') || '',
    isActive: isActiveFlag(row),
    createdBy: pick(row, 'createdBy', 'CreatedBy'),
    createdAt: pick(row, 'createdAt', 'CreatedAt'),
    modifiedBy: pick(row, 'modifiedBy', 'ModifiedBy'),
    modifiedAt: pick(row, 'modifiedAt', 'ModifiedAt'),
  };
}

export function normalizeEmploymentMapping(row) {
  return {
    employmentTypeDocumentMappingId: pick(row, 'employmentTypeDocumentMappingId', 'EmploymentTypeDocumentMappingId'),
    employmentTypeId: pick(row, 'employmentTypeId', 'EmploymentTypeId'),
    customerDocumentTypeId: pick(row, 'customerDocumentTypeId', 'CustomerDocumentTypeId'),
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
    isMandatory: pick(row, 'isMandatory', 'IsMandatory') === true,
    isActive: isActiveFlag(row),
  };
}

export function normalizeAgentCustomerDocument(row) {
  const filePath = pick(row, 'filePath', 'FilePath') || '';
  return {
    source: DOCUMENT_SOURCE.CUSTOMER_PAGE,
    key: `acd-${pick(row, 'agentCustomerDocumentId', 'AgentCustomerDocumentId')}`,
    agentCustomerDocumentId: pick(row, 'agentCustomerDocumentId', 'AgentCustomerDocumentId'),
    agentCustomerId: pick(row, 'agentCustomerId', 'AgentCustomerId'),
    customerDocumentTypeId: pick(row, 'customerDocumentTypeId', 'CustomerDocumentTypeId'),
    customerDocumentTypeName: pick(row, 'customerDocumentTypeName', 'CustomerDocumentTypeName') || '',
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
    documentTypeName: pick(row, 'documentTypeName', 'DocumentTypeName') || '',
    fileName: pick(row, 'fileName', 'FileName') || fileNameFromPath(filePath),
    filePath,
    isActive: isActiveFlag(row),
    createdBy: pick(row, 'createdBy', 'CreatedBy'),
    createdAt: pick(row, 'createdAt', 'CreatedAt'),
    modifiedBy: pick(row, 'modifiedBy', 'ModifiedBy'),
    modifiedAt: pick(row, 'modifiedAt', 'ModifiedAt'),
    applicantSequence: 0,
  };
}

export function normalizeCustomerDocumentProof(row) {
  const filePath = pick(row, 'filePath', 'FilePath') || '';
  const id = pick(row, 'customerDocumentProofId', 'CustomerDocumentProofId', 'id', 'Id');
  const sequence = pick(row, 'applicantSequence', 'ApplicantSequence');
  return {
    source: DOCUMENT_SOURCE.PROOF,
    key: `cdp-${id}`,
    customerDocumentProofId: id,
    agentCustomerId: pick(row, 'agentCustomerId', 'AgentCustomerId'),
    applicationProductDetailsId: pick(row, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
    applicantSequence: hasValue(sequence) ? Number(sequence) : 0,
    verificationTypeCode: pick(row, 'verificationTypeCode', 'VerificationTypeCode') || '',
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
    proofId: pick(row, 'proofId', 'ProofId'),
    fileName: pick(row, 'originalFileName', 'OriginalFileName', 'fileName', 'FileName') || fileNameFromPath(filePath),
    filePath,
    contentType: pick(row, 'contentType', 'ContentType') || '',
    fileSize: pick(row, 'fileSize', 'FileSize'),
    isActive: isActiveFlag(row),
    createdBy: pick(row, 'createdBy', 'CreatedBy'),
    createdAt: pick(row, 'createdAt', 'CreatedAt'),
    modifiedAt: pick(row, 'modifiedAt', 'ModifiedAt'),
  };
}

export function normalizeRejection(row) {
  const sequence = pick(row, 'applicantSequence', 'ApplicantSequence');
  return {
    raw: row,
    backOfficeDocumentRejectionId: pick(row, 'backOfficeDocumentRejectionId', 'BackOfficeDocumentRejectionId', 'id'),
    agentCustomerDocumentId: pick(row, 'agentCustomerDocumentId', 'AgentCustomerDocumentId'),
    customerDocumentProofId: pick(row, 'customerDocumentProofId', 'CustomerDocumentProofId'),
    customerDocumentTypeId: pick(row, 'customerDocumentTypeId', 'CustomerDocumentTypeId'),
    kycDocumentId: pick(row, 'kycDocumentId', 'KYCDocumentId', 'KycDocumentId'),
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
    agentCustomerId: pick(row, 'agentCustomerId', 'AgentCustomerId'),
    applicationProductDetailsId: pick(row, 'applicationProductDetailsId', 'ApplicationProductDetailsId'),
    rmId: pick(row, 'rmId', 'RMId', 'RmId'),
    backOfficeId: pick(row, 'backOfficeId', 'BackOfficeId'),
    applicantSequence: hasValue(sequence) ? Number(sequence) : 0,
    rejectedDocumentType: pick(row, 'rejectedDocumentType', 'RejectedDocumentType') || '',
    originalDocumentPath: pick(row, 'originalDocumentPath', 'OriginalDocumentPath') || '',
    currentDocumentPath: pick(row, 'currentDocumentPath', 'CurrentDocumentPath') || '',
    rejectionRemarks: pick(row, 'rejectionRemarks', 'RejectionRemarks') || '',
    status: pick(row, 'status', 'Status') || '',
    rejectedAt: pick(row, 'rejectedAt', 'RejectedAt', 'createdAt', 'CreatedAt'),
    resubmittedAt: pick(row, 'resubmittedAt', 'ResubmittedAt'),
    verifiedAt: pick(row, 'verifiedAt', 'VerifiedAt'),
    isActive: isActiveFlag(row),
  };
}

/** True when a rejection belongs to the new customer document flow (not the old KYC flow). */
export function isCustomerFlowRejection(rejection) {
  const r = rejection?.raw ? rejection : normalizeRejection(rejection);
  return hasValue(r.agentCustomerDocumentId) || hasValue(r.customerDocumentTypeId) || hasValue(r.customerDocumentProofId);
}

export function applicantLabel(sequence) {
  const seq = Number(sequence) || 0;
  return seq === 0 ? 'Applicant' : `Co-Applicant ${seq}`;
}

export function sortByLatest(a, b) {
  const diff = toTime(b.createdAt) - toTime(a.createdAt);
  if (diff !== 0) return diff;
  const idA = Number(a.agentCustomerDocumentId ?? a.customerDocumentProofId ?? 0);
  const idB = Number(b.agentCustomerDocumentId ?? b.customerDocumentProofId ?? 0);
  return idB - idA;
}

export function sortRejectionsByLatest(a, b) {
  const diff = toTime(b.rejectedAt) - toTime(a.rejectedAt);
  if (diff !== 0) return diff;
  return Number(b.backOfficeDocumentRejectionId || 0) - Number(a.backOfficeDocumentRejectionId || 0);
}

/* ==========================================
   CUSTOMER DOCUMENT TYPE MASTER
========================================== */

export const getCustomerDocumentTypes = async () => {
  const response = await axiosInstance.get('/CustomerDocumentTypeMaster');
  return toList(response.data);
};

export const getCustomerDocumentTypeById = async (id) => {
  const response = await axiosInstance.get(`/CustomerDocumentTypeMaster/${encodeURIComponent(id)}`);
  return response.data?.data || response.data;
};

export const createCustomerDocumentType = async (payload) => {
  const response = await axiosInstance.post('/CustomerDocumentTypeMaster', payload);
  return response.data;
};

export const updateCustomerDocumentType = async (id, payload) => {
  const response = await axiosInstance.put(`/CustomerDocumentTypeMaster/${encodeURIComponent(id)}`, payload);
  return response.data;
};

export const deleteCustomerDocumentType = async (id) => {
  const response = await axiosInstance.delete(`/CustomerDocumentTypeMaster/${encodeURIComponent(id)}`);
  return response.data;
};

/* ==========================================
   EMPLOYMENT TYPE -> CUSTOMER DOCUMENT CATEGORIES
========================================== */

export const getEmploymentMappingsByEmploymentType = async (employmentTypeId) => {
  const response = await axiosInstance.get(
    `/EmploymentTypeDocumentMapping/byemploymenttype/${encodeURIComponent(employmentTypeId)}`
  );
  return toList(response.data);
};

/**
 * Resolves the active customer document categories required for an employment type.
 * Only mappings that carry a CustomerDocumentTypeId belong to the new flow; mappings that
 * only carry the legacy DocumentTypeId are left to the old document flow.
 *
 * @param {Array} categories - normalized CustomerDocumentTypeMaster rows
 */
export function resolveMappedCategories(mappings, categories) {
  const byId = new Map(categories.map((c) => [String(c.customerDocumentTypeId), c]));
  const seen = new Set();
  const result = [];
  mappings.map(normalizeEmploymentMapping).forEach((mapping) => {
    if (!mapping.isActive || !hasValue(mapping.customerDocumentTypeId)) return;
    const key = String(mapping.customerDocumentTypeId);
    const category = byId.get(key);
    if (!category || !category.isActive || seen.has(key)) return;
    seen.add(key);
    result.push({
      ...category,
      employmentTypeDocumentMappingId: mapping.employmentTypeDocumentMappingId,
      employmentTypeId: mapping.employmentTypeId,
      isMandatory: mapping.isMandatory,
    });
  });
  return result;
}

/* ==========================================
   AGENT CUSTOMER DOCUMENT (customer-page documents)
========================================== */

export const getAllAgentCustomerDocuments = async () => {
  const response = await axiosInstance.get('/AgentCustomerDocument');
  return toList(response.data).map(normalizeAgentCustomerDocument);
};

export const getAgentCustomerDocumentById = async (id) => {
  const response = await axiosInstance.get(`/AgentCustomerDocument/${encodeURIComponent(id)}`);
  return normalizeAgentCustomerDocument(response.data?.data || response.data);
};

export const getAgentCustomerDocumentsByCustomer = async (agentCustomerId) => {
  try {
    const response = await axiosInstance.get(
      `/AgentCustomerDocument/bycustomer/${encodeURIComponent(agentCustomerId)}`
    );
    return toList(response.data).map(normalizeAgentCustomerDocument);
  } catch (err) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

export const downloadAgentCustomerDocument = async (id) => {
  const response = await axiosInstance.get(`/AgentCustomerDocument/download/${encodeURIComponent(id)}`, {
    responseType: 'blob',
  });
  return { blob: response.data, contentType: response.headers?.['content-type'] || '' };
};

/**
 * Uploads a customer-page document. Every call stores a new physical file and a new
 * AgentCustomerDocument row, so replacements never overwrite earlier files.
 */
export const uploadAgentCustomerDocument = async (
  { file, agentCustomerId, customerDocumentTypeId, createdBy },
  { onUploadProgress } = {}
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('agentCustomerId', String(agentCustomerId));
  formData.append('customerDocumentTypeId', String(customerDocumentTypeId));
  if (hasValue(createdBy)) formData.append('createdBy', String(createdBy));
  const response = await axiosInstance.post('/AgentCustomerDocument/upload', formData, {
    onUploadProgress,
    timeout: 120000,
  });
  return normalizeAgentCustomerDocument(response.data?.data || response.data);
};

/** Metadata-only update; the stored file is never changed by this call. */
export const updateAgentCustomerDocument = async (id, document, modifiedBy) => {
  const payload = {
    agentCustomerDocumentId: Number(id),
    agentCustomerId: Number(document.agentCustomerId),
    customerDocumentTypeId: hasValue(document.customerDocumentTypeId) ? Number(document.customerDocumentTypeId) : null,
    fileName: document.fileName,
    filePath: document.filePath,
    isActive: document.isActive !== false,
    modifiedBy: hasValue(modifiedBy) ? Number(modifiedBy) : null,
  };
  if (hasValue(document.documentTypeId)) payload.documentTypeId = Number(document.documentTypeId);
  const response = await axiosInstance.put(`/AgentCustomerDocument/${encodeURIComponent(id)}`, payload);
  return response.data;
};

export const deactivateAgentCustomerDocument = async (id, document, modifiedBy) =>
  updateAgentCustomerDocument(id, { ...document, isActive: false }, modifiedBy);

export const deleteAgentCustomerDocument = async (id) => {
  const response = await axiosInstance.delete(`/AgentCustomerDocument/${encodeURIComponent(id)}`);
  return response.data;
};

/* ==========================================
   CUSTOMER DOCUMENT PROOF (additional applicant + co-applicant proofs)
========================================== */

export const getCustomerDocumentProofs = async (filters = {}) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => hasValue(v)));
  try {
    const response = await axiosInstance.get('/customerdocumentproof', { params });
    return toList(response.data).map(normalizeCustomerDocumentProof);
  } catch (err) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

export const getCustomerDocumentProofById = async (id) => {
  const response = await axiosInstance.get(`/customerdocumentproof/${encodeURIComponent(id)}`);
  return normalizeCustomerDocumentProof(response.data?.data || response.data);
};

export const downloadCustomerDocumentProof = async (id) => {
  const response = await axiosInstance.get(`/customerdocumentproof/${encodeURIComponent(id)}/download`, {
    responseType: 'blob',
  });
  return { blob: response.data, contentType: response.headers?.['content-type'] || '' };
};

function proofFormData(proof, file) {
  const formData = new FormData();
  formData.append('AgentCustomerId', String(proof.agentCustomerId));
  if (hasValue(proof.applicationProductDetailsId)) {
    formData.append('ApplicationProductDetailsId', String(proof.applicationProductDetailsId));
  }
  formData.append('ApplicantSequence', String(proof.applicantSequence ?? 0));
  if (hasValue(proof.verificationTypeCode)) formData.append('VerificationTypeCode', proof.verificationTypeCode);
  formData.append('DocumentTypeId', String(proof.documentTypeId));
  formData.append('ProofId', String(proof.proofId));
  formData.append('File', file);
  return formData;
}

/**
 * Stores a corrected proof as a new CustomerDocumentProof record. When the server rejects a
 * duplicate, the active records for the same applicant/proof are soft-deleted (IsActive = false)
 * first, so their files and history stay on the server. PUT is avoided because it replaces the
 * stored file.
 */
export const uploadCorrectedCustomerDocumentProof = async (previousProof, file, { onUploadProgress } = {}) => {
  const post = () => axiosInstance.post('/customerdocumentproof', proofFormData(previousProof, file), {
    onUploadProgress,
    timeout: 120000,
  });
  try {
    const response = await post();
    return normalizeCustomerDocumentProof(response.data?.data || response.data);
  } catch (err) {
    if (err?.response?.status !== 409) throw err;
    const duplicates = (await getCustomerDocumentProofs({
      agentCustomerId: previousProof.agentCustomerId,
      applicationProductDetailsId: previousProof.applicationProductDetailsId,
      applicantSequence: previousProof.applicantSequence,
    })).filter((p) => p.isActive
      && sameId(p.documentTypeId, previousProof.documentTypeId)
      && sameId(p.proofId, previousProof.proofId)
      && String(p.verificationTypeCode || '').toUpperCase() === String(previousProof.verificationTypeCode || '').toUpperCase());
    if (duplicates.length === 0) throw err;
    for (const duplicate of duplicates) {
      await axiosInstance.delete(`/customerdocumentproof/${encodeURIComponent(duplicate.customerDocumentProofId)}`);
    }
    const response = await post();
    return normalizeCustomerDocumentProof(response.data?.data || response.data);
  }
};

/**
 * Uploads the RM's corrected file for a new-flow rejection as a new document:
 *   - customer-page rejection -> POST /AgentCustomerDocument/upload (same CustomerDocumentTypeId)
 *   - proof rejection         -> new CustomerDocumentProof record
 * The rejected file is never overwritten, so OriginalDocumentPath and history stay valid.
 */
export const uploadCorrectionForRejection = async (rejectionRow, file, { agentCustomerId, createdBy } = {}) => {
  const rejection = rejectionRow?.raw ? rejectionRow : normalizeRejection(rejectionRow);
  const customerId = rejection.agentCustomerId ?? agentCustomerId;

  if (hasValue(rejection.customerDocumentProofId)) {
    let proof = null;
    try {
      proof = await getCustomerDocumentProofById(rejection.customerDocumentProofId);
    } catch (err) {
      if (err?.response?.status !== 404) throw err;
    }
    if (!proof) {
      // The rejected record was already superseded by an earlier correction attempt.
      const candidates = (await getCustomerDocumentProofs({
        agentCustomerId: customerId,
        applicationProductDetailsId: rejection.applicationProductDetailsId,
        applicantSequence: rejection.applicantSequence,
        documentTypeId: rejection.documentTypeId,
      })).filter((p) => p.isActive).sort(sortByLatest);
      proof = candidates[0] || null;
    }
    if (!proof) throw new Error('The rejected proof document could not be found. Please contact Back Office.');
    return uploadCorrectedCustomerDocumentProof({
      ...proof,
      agentCustomerId: proof.agentCustomerId ?? customerId,
      applicationProductDetailsId: proof.applicationProductDetailsId ?? rejection.applicationProductDetailsId,
      applicantSequence: proof.applicantSequence ?? rejection.applicantSequence,
    }, file);
  }

  let customerDocumentTypeId = rejection.customerDocumentTypeId;
  let targetCustomerId = customerId;
  if ((!hasValue(customerDocumentTypeId) || !hasValue(targetCustomerId)) && hasValue(rejection.agentCustomerDocumentId)) {
    const original = await getAgentCustomerDocumentById(rejection.agentCustomerDocumentId);
    customerDocumentTypeId = customerDocumentTypeId ?? original.customerDocumentTypeId;
    targetCustomerId = targetCustomerId ?? original.agentCustomerId;
  }
  if (!hasValue(customerDocumentTypeId)) throw new Error('Customer document category is missing on this rejection.');
  if (!hasValue(targetCustomerId)) throw new Error('Customer ID is missing on this rejection.');

  return uploadAgentCustomerDocument({ file, agentCustomerId: targetCustomerId, customerDocumentTypeId, createdBy });
};

/** Proof categories (DocumentTypeMaster) used to label CustomerDocumentProof rows. */
export const getProofCategories = async () => {
  const response = await axiosInstance.get('/DocumentTypeMaster');
  return toList(response.data).map((row) => ({
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
    documentTypeName: pick(row, 'documentTypeName', 'DocumentTypeName', 'documentTypeCode', 'DocumentTypeCode') || '',
  }));
};

/** Proof names (ProofMaster) used to label CustomerDocumentProof rows. */
export const getProofs = async () => {
  const response = await axiosInstance.get('/proofmaster');
  return toList(response.data).map((row) => ({
    proofId: pick(row, 'proofId', 'ProofId'),
    proofName: pick(row, 'proofName', 'ProofName', 'proofCode', 'ProofCode') || '',
    documentTypeId: pick(row, 'documentTypeId', 'DocumentTypeId'),
  }));
};

/** Downloads a stored file by its server path (used for archived originals on rejections). */
export const downloadDocumentByPath = async (path) => {
  let serverPath = String(path || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!serverPath.startsWith('UploadedFiles/')) serverPath = `UploadedFiles/${serverPath}`;
  const response = await axiosInstance.get('/ApplicationKYCDocuments/download', {
    params: { path: serverPath },
    responseType: 'blob',
  });
  return { blob: response.data, contentType: response.headers?.['content-type'] || '' };
};

/* ==========================================
   BACK OFFICE DOCUMENT REJECTION
========================================== */

export const getRejectionsByApplication = async (applicationProductDetailsId) => {
  try {
    const response = await axiosInstance.get(
      `/BackOfficeDocumentRejection/application/${encodeURIComponent(applicationProductDetailsId)}`
    );
    return toList(response.data).map(normalizeRejection);
  } catch (err) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

export const getReturnedRejectionsForRm = async (rmId) => {
  const response = await axiosInstance.get(`/BackOfficeDocumentRejection/rm/${encodeURIComponent(rmId)}/returned`);
  return toList(response.data).map(normalizeRejection);
};

/** Rejects a customer-page document (AgentCustomerDocument). */
export const rejectCustomerPageDocument = async ({
  document,
  rmId,
  applicationProductDetailsId,
  backOfficeId,
  rejectionRemarks,
}) => {
  const payload = {
    agentCustomerDocumentId: Number(document.agentCustomerDocumentId),
    customerDocumentTypeId: Number(document.customerDocumentTypeId),
    agentCustomerId: Number(document.agentCustomerId),
    rmId: Number(rmId),
    applicationProductDetailsId: Number(applicationProductDetailsId),
    applicantSequence: 0,
    rejectionRemarks: rejectionRemarks.trim(),
    backOfficeId: Number(backOfficeId),
    createdBy: Number(backOfficeId),
  };
  const response = await axiosInstance.post('/BackOfficeDocumentRejection', payload);
  return normalizeRejection(response.data?.data || response.data);
};

/** Rejects an RM-uploaded proof (CustomerDocumentProof) for the applicant or a co-applicant. */
export const rejectCustomerDocumentProof = async ({
  proof,
  agentCustomerId,
  rmId,
  applicationProductDetailsId,
  backOfficeId,
  rejectionRemarks,
  rejectedDocumentType,
}) => {
  const payload = {
    customerDocumentProofId: Number(proof.customerDocumentProofId),
    documentTypeId: hasValue(proof.documentTypeId) ? Number(proof.documentTypeId) : null,
    agentCustomerId: Number(agentCustomerId ?? proof.agentCustomerId),
    rmId: Number(rmId),
    applicationProductDetailsId: Number(applicationProductDetailsId),
    applicantSequence: Number(proof.applicantSequence) || 0,
    rejectedDocumentType: rejectedDocumentType ? String(rejectedDocumentType).slice(0, 50) : undefined,
    rejectionRemarks: rejectionRemarks.trim(),
    backOfficeId: Number(backOfficeId),
    createdBy: Number(backOfficeId),
  };
  const response = await axiosInstance.post('/BackOfficeDocumentRejection', payload);
  return normalizeRejection(response.data?.data || response.data);
};

/** RM resubmits a rejection after the corrected file was uploaded as a new document. */
export const resubmitRejection = async (id, rmId) => {
  const response = await axiosInstance.put(
    `/BackOfficeDocumentRejection/${encodeURIComponent(id)}/resubmit`,
    { rmId: Number(rmId) }
  );
  return normalizeRejection(response.data?.data || response.data);
};

/** Back Office accepts a resubmitted document and closes the rejection cycle. */
export const verifyRejection = async (id, backOfficeId) => {
  const response = await axiosInstance.put(
    `/BackOfficeDocumentRejection/${encodeURIComponent(id)}/verify`,
    { backOfficeId: Number(backOfficeId) }
  );
  return normalizeRejection(response.data?.data || response.data);
};

/* ==========================================
   COMBINED DOCUMENT SET (Back Office)
========================================== */

/**
 * Loads every applicant and co-applicant document from both sources:
 *   GET /AgentCustomerDocument/bycustomer/{agentCustomerId}
 *   GET /customerdocumentproof
 * Records stay in their original tables; they are only merged for display.
 */
export const loadCombinedCustomerDocuments = async ({ agentCustomerId, applicationProductDetailsId }) => {
  const [customerPage, proofs] = await Promise.allSettled([
    getAgentCustomerDocumentsByCustomer(agentCustomerId),
    getCustomerDocumentProofs({ agentCustomerId }),
  ]);

  const errors = [];
  if (customerPage.status === 'rejected') errors.push({ source: DOCUMENT_SOURCE.CUSTOMER_PAGE, error: customerPage.reason });
  if (proofs.status === 'rejected') errors.push({ source: DOCUMENT_SOURCE.PROOF, error: proofs.reason });

  const customerPageDocs = (customerPage.value || [])
    .filter((d) => sameId(d.agentCustomerId, agentCustomerId) || !hasValue(d.agentCustomerId));
  const proofDocs = (proofs.value || [])
    .filter((p) => p.isActive)
    .filter((p) => !hasValue(p.agentCustomerId) || sameId(p.agentCustomerId, agentCustomerId))
    .filter((p) => !hasValue(applicationProductDetailsId)
      || !hasValue(p.applicationProductDetailsId)
      || sameId(p.applicationProductDetailsId, applicationProductDetailsId));

  return { customerPageDocs, proofDocs, errors };
};
