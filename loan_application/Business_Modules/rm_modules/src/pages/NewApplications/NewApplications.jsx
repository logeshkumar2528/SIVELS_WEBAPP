import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import DataTable from '../../components/DataTable/DataTable';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import Button from '../../components/Button/Button';
import Pagination from '../../components/Pagination/Pagination';
import Select from '../../components/Select/Select';
import Modal from '../../components/Modal/Modal';
import { ROUTES } from '../../config/routeConfig';
import { formatDate } from '../../utils/dateHelper';
import {
  buildAllowedAgentIdSet,
  filterAgentsForRm,
  getCurrentRMContext,
  normalizeApplicationStatus,
  resolveApiArray,
} from '../../utils/rmContext';
import { resolveApplicationOwnership } from '../../utils/ownershipHelper';
import './NewApplications.css';
import { buildApplicationDisplayId } from '../applicationWizard/flowUtils';
import { resolveDocumentTypeId, validateApplicantDocumentFile } from '../../../../../Core/src/utils/documentTypeHelper';
import { resolveVerificationIdByCodeOrName } from '../../../../../Core/src/utils/verificationHelper';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const normalizeMobile = (value) => String(value || '').replace(/\D/g, '');

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return `Rs. ${Number(value).toLocaleString('en-IN')}`;
};

export const getRejectionSortTime = (r) => {
  const vTime = new Date(r?.verifiedAt || r?.VerifiedAt || 0).getTime();
  if (vTime > 0) return vTime;
  const resTime = new Date(r?.resubmittedAt || r?.ResubmittedAt || 0).getTime();
  if (resTime > 0) return resTime;
  const rejTime = new Date(r?.rejectedAt || r?.RejectedAt || 0).getTime();
  if (rejTime > 0) return rejTime;
  const cTime = new Date(r?.createdAt || r?.CreatedAt || 0).getTime();
  return cTime > 0 ? cTime : 0;
};

export const sortRejectionsByLatest = (a, b) => {
  const timeA = getRejectionSortTime(a);
  const timeB = getRejectionSortTime(b);
  if (timeA !== timeB) return timeB - timeA;
  const idA = Number(a?.backOfficeDocumentRejectionId ?? a?.BackOfficeDocumentRejectionId ?? a?.id ?? 0);
  const idB = Number(b?.backOfficeDocumentRejectionId ?? b?.BackOfficeDocumentRejectionId ?? b?.id ?? 0);
  return idB - idA;
};

export const getRejectionSlotKey = (r) => {
  const seq =
    r?.applicantSequence !== undefined && r?.applicantSequence !== null
      ? Number(r.applicantSequence)
      : (r?.ApplicantSequence !== undefined && r?.ApplicantSequence !== null ? Number(r.ApplicantSequence) : 0);
  const rawType = String(r?.rejectedDocumentType || r?.RejectedDocumentType || '').toUpperCase().trim();
  const isZipManual = rawType.includes('ZIP') || rawType.includes('ARCHIVE') || rawType.includes('MANUAL');
  const manualIdx =
    r?.manualDocumentIndex !== undefined && r?.manualDocumentIndex !== null
      ? Number(r.manualDocumentIndex)
      : (r?.ManualDocumentIndex !== undefined && r?.ManualDocumentIndex !== null ? Number(r.ManualDocumentIndex) : null);

  if (isZipManual && manualIdx !== null && !isNaN(manualIdx)) {
    return `${seq}_MANUAL_SLOT_${manualIdx}`;
  }
  const docTypeId = r?.documentTypeId ?? r?.DocumentTypeId ?? '';
  return `${seq}_${rawType}_${docTypeId}`;
};

export const deduplicateRejectionsPerSlot = (rejections = []) => {
  if (!Array.isArray(rejections) || rejections.length === 0) return [];
  const sorted = [...rejections].sort(sortRejectionsByLatest);
  const seenKeys = new Set();
  const deduped = [];
  for (const rej of sorted) {
    if (!rej) continue;
    const key = getRejectionSlotKey(rej);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(rej);
    }
  }
  return deduped;
};

export const getRejectedDocumentLabel = (rejection) => {
  if (!rejection) return 'Document';
  const rawType = String(rejection.rejectedDocumentType || rejection.RejectedDocumentType || '').toUpperCase().trim();

  const isCoApp =
    rawType.includes('CO_APPLICANT') ||
    rawType.includes('COAPPLICANT') ||
    rawType.startsWith('CO_') ||
    rawType.startsWith('CO-') ||
    ((rejection.applicantSequence ?? rejection.ApplicantSequence) !== undefined &&
      (rejection.applicantSequence ?? rejection.ApplicantSequence) !== null &&
      Number(rejection.applicantSequence ?? rejection.ApplicantSequence) > 0);

  let prefix = isCoApp ? 'Co-Applicant' : 'Applicant';
  if ((rejection.applicantSequence ?? rejection.ApplicantSequence) !== undefined &&
      (rejection.applicantSequence ?? rejection.ApplicantSequence) !== null) {
    const seq = Number(rejection.applicantSequence ?? rejection.ApplicantSequence);
    if (seq === 0) prefix = 'Applicant';
    else if (seq === 1) prefix = 'Co-Applicant 1';
    else if (seq === 2) prefix = 'Co-Applicant 2';
    else if (seq === 3) prefix = 'Co-Applicant 3';
    else if (seq > 3) prefix = `Co-Applicant ${seq}`;
  }

  const isSalary = rawType.includes('SALARY') || rawType.includes('INCOME_SHEET') || rawType.includes('INCOME SHEET');
  const isBank = rawType.includes('BANK') || rawType.includes('STATEMENT');
  const isProfile = rawType.includes('PROFILE') || rawType.includes('PHOTO') || rawType.includes('IMAGE');
  const isAadhaar = rawType.includes('AADHAAR') || rawType.includes('AADHAR') || rawType.includes('ADHAAR') || rawType.includes('UID');
  const isPan = rawType.includes('PAN');
  const isZip = rawType.includes('ZIP') || rawType.includes('MANUAL') || rawType.includes('ARCHIVE');

  if (isSalary) return `${prefix} Salary Slip / Income Sheet`;
  if (isBank) return `${prefix} Bank Statement`;
  if (isProfile) return `${prefix} Profile Image`;
  if (isAadhaar) return `${prefix} Aadhaar Card`;
  if (isPan) return `${prefix} PAN Card`;
  if (isZip) {
    const rawIdx = rejection.manualDocumentIndex ?? rejection.ManualDocumentIndex;
    if (rawIdx !== undefined && rawIdx !== null && !isNaN(Number(rawIdx))) {
      return `${prefix} Manual Document ${Number(rawIdx) + 1}`;
    }
    return `${prefix} Manual Document`;
  }
  return `${prefix} ${rejection.rejectedDocumentType || 'Document'}`;
};

const mapBackendApplication = (item, index, agentsById = {}, rmsById = {}, rejections = [], matchedProduct = null) => {
  const applicationId = item.applicationId || item.applicationNumber || item.agentCustomerId || item.customerId || `${index + 1}`;
  const ownership = resolveApplicationOwnership(item, agentsById, rmsById);
  let normalizedStatus = normalizeApplicationStatus(item.status, item.statusName || item.StatusName);

  if (rejections && rejections.length > 0) {
    const hasActiveReturn = rejections.some((r) => r.status === 'ReturnedToRM');
    if (hasActiveReturn) {
      normalizedStatus = 'Returned';
    }
  }

  return {
    id: String(applicationId),
    displayId: buildApplicationDisplayId(item, applicationId),
    customerName: item.fullName || item.customerName || '',
    mobile: normalizeMobile(item.mobileNumber || item.mobile || ''),
    loanType: item.loanProductName || item.loanPurposeName || item.loanType || '',
    amount: formatCurrency(item.expectedLoanAmount ?? item.amount),
    agentName: ownership.agentName,
    createdDate: formatDate(item.createdAt || item.createdDate),
    createdAt: item.createdAt || item.createdDate || item.CreatedAt || item.CreatedDate || null,
    rawCreatedAt: item.createdAt || item.createdDate || item.CreatedAt || item.CreatedDate || item.submittedAt || item.SubmittedAt || null,
    status: normalizedStatus,
    rawStatus: normalizedStatus,
    agentCustomerId: item.agentCustomerId || item.customerId || null,
    applicationProductDetailsId:
      matchedProduct?.applicationProductDetailsId ||
      matchedProduct?.ApplicationProductDetailsId ||
      item.applicationProductDetailsId ||
      item.ApplicationProductDetailsId ||
      null,
    agentId: ownership.agentId,
    rejections: rejections || [],
  };
};

export default function NewApplications({ initialFilter = 'All' }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorPopup, setErrorPopup] = useState('');
  const pageSizeOptions = [7, 10, 15, 20];

  // Returned Application Review & Correction Modal state
  const [selectedReturnApp, setSelectedReturnApp] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [isSubmittingRejection, setIsSubmittingRejection] = useState({});
  const [rejectionFeedback, setRejectionFeedback] = useState({});

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const SearchIcon = iconMap['Search'];
  const FilterIcon = iconMap['Filter'];

  useEffect(() => {
    setStatusFilter(initialFilter);
    setCurrentPage(1);
    setSearchTerm('');
  }, [initialFilter]);

  const loadApplications = useCallback(async () => {
    const rmContext = getCurrentRMContext();

    if (!rmContext.rmId) {
      setApplications([]);
      setErrorPopup('No RM context found in session. Please sign in again.');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const authHeaders = {};
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;

      const [agentRes, customerRes, rmRes, rejectionsRes, appProdRes] = await Promise.all([
        fetch(`${API_BASE}/AgentMaster`, { headers: authHeaders }),
        fetch(`${API_BASE}/AgentAddCustomer`, { headers: authHeaders }),
        fetch(`${API_BASE}/RMMaster`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/BackOfficeDocumentRejection/rm/${rmContext.rmId}/returned`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/ApplicationProductDetails`, { headers: authHeaders }).catch(() => null),
      ]);

      if (!agentRes.ok) {
        throw new Error(`Failed to load agents (${agentRes.status})`);
      }
      if (!customerRes.ok) {
        throw new Error(`Failed to load applications (${customerRes.status})`);
      }

      const [agentsData, customersData] = await Promise.all([
        agentRes.json(),
        customerRes.json(),
      ]);

      let rmsData = [];
      if (rmRes && rmRes.ok) {
        try {
          const rData = await rmRes.json();
          rmsData = resolveApiArray(rData);
        } catch {
          rmsData = [];
        }
      }
      const rmsById = rmsData.reduce((result, rm) => {
        const id = rm.rmId || rm.RMId || rm.id;
        if (id !== undefined && id !== null) result[String(id)] = rm;
        return result;
      }, {});

      let returnedRejections = [];
      if (rejectionsRes && rejectionsRes.ok) {
        try {
          const rejData = await rejectionsRes.json();
          returnedRejections = resolveApiArray(rejData);
        } catch {
          returnedRejections = [];
        }
      }

      let appProdList = [];
      if (appProdRes && appProdRes.ok) {
        try {
          const pData = await appProdRes.json();
          appProdList = resolveApiArray(pData);
        } catch {
          appProdList = [];
        }
      }

      // Build Set of customer IDs that belong directly to this RM
      const rmOwnedCustomerIds = new Set();
      appProdList.forEach((p) => {
        if (Number(p.rmId || p.RMId) === Number(rmContext.rmId) && p.agentCustomerId) {
          rmOwnedCustomerIds.add(String(p.agentCustomerId));
        }
      });

      // Index active rejections by agentCustomerId & applicationProductDetailsId
      const activeRejectionsByCustId = {};
      const activeRejectionsByAppProdId = {};
      returnedRejections.forEach((rej) => {
        if (rej.status === 'ReturnedToRM') {
          if (rej.agentCustomerId) {
            const k = String(rej.agentCustomerId);
            if (!activeRejectionsByCustId[k]) activeRejectionsByCustId[k] = [];
            activeRejectionsByCustId[k].push(rej);
          }
          if (rej.applicationProductDetailsId) {
            const k = String(rej.applicationProductDetailsId);
            if (!activeRejectionsByAppProdId[k]) activeRejectionsByAppProdId[k] = [];
            activeRejectionsByAppProdId[k].push(rej);
          }
        }
      });

      const allAgents = resolveApiArray(agentsData);
      const agentsById = allAgents.reduce((result, agent) => {
        const id = agent.agentId || agent.AgentId;
        if (id !== undefined && id !== null) result[String(id)] = agent;
        return result;
      }, {});

      const matchedAgents = filterAgentsForRm(allAgents, rmContext.rmId);
      const agentIds = buildAllowedAgentIdSet(matchedAgents);

      const allCustomers = resolveApiArray(customersData);
      const filtered = allCustomers.filter((item) => {
        const ownership = resolveApplicationOwnership(item, agentsById, rmsById);
        const rowCustId = String(item.agentCustomerId || item.customerId || '');
        
        // 1. Normal agent-sourced customer: belongs to an agent assigned to this RM
        const isAgentMapped = Boolean(
          ownership.isAgentCreated &&
          ownership.agentId &&
          agentIds.has(Number(ownership.agentId))
        );

        // 2. Promoted RM-sourced customer: belongs directly to this RM
        const isRmDirectOwned = Boolean(
          ownership.isDirectRm && (
            rmOwnedCustomerIds.has(rowCustId) ||
            Number(ownership.rmId) === Number(rmContext.rmId) ||
            Number(item.rmId || item.RMId) === Number(rmContext.rmId) ||
            Number(item.createdBy || item.CreatedBy) === Number(rmContext.rmId)
          )
        );

        // 3. Active rejection for this RM
        const hasActiveRejection = Boolean(activeRejectionsByCustId[rowCustId]);

        return isAgentMapped || isRmDirectOwned || hasActiveRejection;
      });

      const mapped = filtered.map((item, index) => {
        const custId = String(item.agentCustomerId || item.customerId || '');
        const rawItemRejections = activeRejectionsByCustId[custId] || [];
        const itemRejections = deduplicateRejectionsPerSlot(rawItemRejections);
        const matchedProduct = appProdList.find(
          (p) => String(p.agentCustomerId || p.AgentCustomerId) === custId
        );
        return mapBackendApplication(item, index, agentsById, rmsById, itemRejections, matchedProduct);
      });

      setApplications(mapped);
      setSelectedReturnApp((prev) => {
        if (!prev) return null;
        const fresh = mapped.find(
          (a) => String(a.id) === String(prev.id) || (a.agentCustomerId && String(a.agentCustomerId) === String(prev.agentCustomerId))
        );
        return fresh || prev;
      });
    } catch (error) {
      console.error('Failed to fetch applications or rejections:', error);
      setApplications([]);
      setErrorPopup('Unable to load live applications for this RM. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleResubmitDocument = async (rejection) => {
    const rejId = rejection.backOfficeDocumentRejectionId ?? rejection.BackOfficeDocumentRejectionId ?? rejection.id;
    const file = selectedFiles[rejId];
    if (!file) {
      setRejectionFeedback((prev) => ({
        ...prev,
        [rejId]: { type: 'error', message: 'Please select a replacement document file before resubmitting.' }
      }));
      return;
    }

    const valRes = validateApplicantDocumentFile(file);
    if (!valRes.valid) {
      setRejectionFeedback((prev) => ({
        ...prev,
        [rejId]: { type: 'error', message: valRes.error }
      }));
      return;
    }

    const rmContext = getCurrentRMContext();
    const rmId = Number(rmContext.rmId || 20);
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    setIsSubmittingRejection((prev) => ({ ...prev, [rejId]: true }));
    setRejectionFeedback((prev) => ({ ...prev, [rejId]: null }));

    try {
      const rawSeq = rejection.applicantSequence ?? rejection.ApplicantSequence;
      const rawType = String(rejection.rejectedDocumentType ?? rejection.RejectedDocumentType ?? '').toUpperCase().trim();
      const rawKycId =
        rejection.kycDocumentId ??
        rejection.KYCDocumentId ??
        rejection.applicationKYCDocumentId ??
        rejection.ApplicationKYCDocumentId;
      const rawAppProdId =
        rejection.applicationProductDetailsId ??
        rejection.ApplicationProductDetailsId ??
        selectedReturnApp?.applicationProductDetailsId ??
        selectedReturnApp?.ApplicationProductDetailsId ??
        selectedReturnApp?.id;

      const isCoApp =
        rawType.includes('CO_APPLICANT') ||
        rawType.includes('COAPPLICANT') ||
        rawType.startsWith('CO_') ||
        rawType.startsWith('CO-') ||
        (rawSeq !== undefined && rawSeq !== null && rawSeq !== '' && Number(rawSeq) > 0);

      const seq =
        (rawSeq !== undefined && rawSeq !== null && rawSeq !== '')
          ? Number(rawSeq)
          : (isCoApp ? 1 : 0);

      const appProdId = rawAppProdId;

      const isProfile = rawType.includes('PROFILE') || rawType.includes('PHOTO') || rawType.includes('IMAGE');
      const isAadhaar = rawType.includes('AADHAAR') || rawType.includes('AADHAR') || rawType.includes('ADHAAR') || rawType.includes('UID');
      const isPan = rawType.includes('PAN');
      const isIdentityDoc = isProfile || isAadhaar || isPan;

      const isZipManual =
        rawType.includes('ZIP') ||
        rawType.includes('ARCHIVE') ||
        rawType.includes('MANUAL') ||
        rawType === 'MANUAL_DOCUMENT' ||
        rawType === 'ZIP_ARCHIVE';

      if (isIdentityDoc || isZipManual) {
        // Step 1: Resolve KYC Document ID from Direct Rejection field or Primary KYC Row fallback
        let kycId = (rawKycId !== undefined && rawKycId !== null && rawKycId !== '') ? Number(rawKycId) : null;
        if (!kycId && appProdId) {
          try {
            const kycRes = await fetch(`${API_BASE}/ApplicationKYCDocuments/by-application/${appProdId}`, { headers });
            if (kycRes.ok) {
              const kycData = await kycRes.json();
              const kycArr = resolveApiArray(kycData);
              const matchedKyc = kycArr.find((k) => {
                if (!k || k.isActive === false || k.IsActive === false) return false;
                // Exclude applicant document tuples (financial records)
                if (k.documentStatus || k.DocumentStatus || k.originalFileName || k.OriginalFileName) return false;
                const kSeq = (k.applicantSequence !== undefined && k.applicantSequence !== null)
                  ? Number(k.applicantSequence)
                  : ((k.ApplicantSequence !== undefined && k.ApplicantSequence !== null) ? Number(k.ApplicantSequence) : 0);
                return kSeq === seq;
              });
              if (matchedKyc) {
                const foundKycId =
                  matchedKyc.applicationKYCDocumentId ??
                  matchedKyc.ApplicationKYCDocumentId ??
                  matchedKyc.kycDocumentId ??
                  matchedKyc.KYCDocumentId ??
                  matchedKyc.id ??
                  matchedKyc.Id;
                if (foundKycId !== undefined && foundKycId !== null && foundKycId !== '') {
                  kycId = Number(foundKycId);
                }
              }
            }
          } catch {}
        }

        if (!kycId) {
          throw new Error(`Application KYC Document ID could not be resolved for applicant sequence ${seq}. Please ensure KYC record exists before resubmitting.`);
        }

        if (isZipManual) {
          // Confirmed backend contract: Slot-level manual document replacement
          // PUT /api/ApplicationKYCDocuments/{kycDocumentId}/manual/{manualDocumentIndex} with multipart 'file'
          const rawManualIdx = rejection.manualDocumentIndex ?? rejection.ManualDocumentIndex;
          const manualDocumentIndex =
            rawManualIdx !== undefined && rawManualIdx !== null ? Number(rawManualIdx) : 0;

          if (isNaN(manualDocumentIndex) || manualDocumentIndex < 0) {
            throw new Error(`Invalid manual document slot index: ${rawManualIdx}. Resubmission blocked.`);
          }

          const formData = new FormData();
          formData.append('file', file);

          const uploadUrl = `${API_BASE}/ApplicationKYCDocuments/${kycId}/manual/${manualDocumentIndex}`;
          let uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers,
            body: formData,
          });

          if (!uploadRes.ok) {
            const errTxt = await uploadRes.text().catch(() => '');
            throw new Error(`Failed to upload replacement manual document slot ${manualDocumentIndex + 1} (${uploadRes.status}): ${errTxt}`);
          }
        } else {
          // Identity Documents: profile-image, aadhar, pan
          let route = 'profile-image';
          if (isAadhaar) route = 'aadhar';
          else if (isPan) route = 'pan';

          const formData = new FormData();
          formData.append('file', file);
          formData.append('File', file);

          const uploadUrl = `${API_BASE}/ApplicationKYCDocuments/${kycId}/${route}`;
          let uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers,
            body: formData,
          });

          if (!uploadRes.ok && uploadRes.status === 405) {
            uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers,
              body: formData,
            });
          }

          if (!uploadRes.ok) {
            const errTxt = await uploadRes.text().catch(() => '');
            throw new Error(`Failed to upload replacement identity document (${uploadRes.status}): ${errTxt}`);
          }
        }
      } else {
        // Generic Applicant Documents (Salary Slip, Bank Statement, Property, etc.)
        // Step 1: Dynamically resolve DocumentTypeId from DocumentTypeMaster
        let docTypeId = rejection.documentTypeId ?? rejection.DocumentTypeId;
        if (!docTypeId) {
          let targetCategory = rejection.rejectedDocumentType ?? rejection.RejectedDocumentType ?? '';
          if (rawType.includes('SALARY') || rawType.includes('INCOME')) targetCategory = 'Salary Slip';
          else if (rawType.includes('BANK') || rawType.includes('STATEMENT')) targetCategory = 'Bank Statement';
          else if (rawType.includes('PROPERTY')) targetCategory = 'property';

          try {
            const masterRes = await fetch(`${API_BASE}/DocumentTypeMaster`, { headers });
            if (masterRes.ok) {
              const masterData = await masterRes.json();
              const masterList = resolveApiArray(masterData);
              docTypeId = resolveDocumentTypeId(masterList, targetCategory);
            }
          } catch {}
        }

        if (!docTypeId) {
          throw new Error(`Document Type could not be dynamically resolved from DocumentTypeMaster for "${rejection.rejectedDocumentType ?? rejection.RejectedDocumentType}". Resubmission blocked.`);
        }

        // Step 2: Dynamically resolve VerificationId from VerificationMaster
        let verificationId = null;
        try {
          const vRes = await fetch(`${API_BASE}/VerificationMaster`, { headers });
          if (vRes.ok) {
            const vData = await vRes.json();
            const vList = resolveApiArray(vData);
            verificationId = resolveVerificationIdByCodeOrName(vList, 'Pending');
          }
        } catch {}

        if (!verificationId) {
          throw new Error('Unable to resolve Pending verification status from Verification Master.');
        }

        if (!appProdId) {
          throw new Error('Application Product Details ID is missing. Resubmission blocked.');
        }

        // Step 3: Check whether tuple already exists in ApplicationKYCDocuments
        let tupleExists = false;
        try {
          const checkRes = await fetch(
            `${API_BASE}/ApplicationKYCDocuments/applicant-document?applicationProductDetailsId=${appProdId}&applicantSequence=${seq}&documentTypeId=${docTypeId}`,
            { headers }
          );
          if (checkRes.ok) {
            const checkData = await checkRes.json().catch(() => null);
            if (checkData) tupleExists = true;
          }
        } catch {
          tupleExists = false;
        }

        // Step 4: Construct FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('File', file);
        formData.append('applicationProductDetailsId', String(appProdId));
        formData.append('applicantSequence', String(seq));
        formData.append('documentTypeId', String(docTypeId));
        formData.append('verificationId', String(verificationId));
        formData.append('uploadedBy', String(rmId));

        // Step 5: Upload via PUT (if tuple exists) or POST (if new)
        const uploadUrl = `${API_BASE}/ApplicationKYCDocuments/applicant-document/upload`;
        let uploadRes;

        if (tupleExists) {
          uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers,
            body: formData,
          });

          // Fallback to POST only if 404 or "No active document was found"
          if (!uploadRes.ok) {
            const errTxt = await uploadRes.text().catch(() => '');
            if (uploadRes.status === 404 || errTxt.includes('No active document was found') || uploadRes.status === 405) {
              uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                headers,
                body: formData,
              });
            } else {
              throw new Error(`Failed to update replacement document (${uploadRes.status}): ${errTxt}`);
            }
          }
        } else {
          uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers,
            body: formData,
          });
        }

        if (!uploadRes.ok) {
          const errTxt = await uploadRes.text().catch(() => '');
          throw new Error(`Failed to upload replacement document (${uploadRes.status}): ${errTxt}`);
        }
      }

      // Step 2: Call Resubmit on BackOfficeDocumentRejection
      const resubmitRes = await fetch(`${API_BASE}/BackOfficeDocumentRejection/${rejId}/resubmit`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rmId }),
      });

      if (!resubmitRes.ok) {
        const errTxt = await resubmitRes.text().catch(() => '');
        throw new Error(`Failed to update rejection status to Resubmitted (${resubmitRes.status}): ${errTxt}`);
      }

      setRejectionFeedback((prev) => ({
        ...prev,
        [rejId]: { type: 'success', message: 'Document corrected and successfully resubmitted to Back Office!' }
      }));

      // Refresh application list from backend (source of truth)
      await loadApplications();
    } catch (err) {
      console.error('Error during resubmission:', err);
      setRejectionFeedback((prev) => ({
        ...prev,
        [rejId]: { type: 'error', message: err.message || 'Failed to resubmit document. Please try again.' }
      }));
    } finally {
      setIsSubmittingRejection((prev) => ({ ...prev, [rejId]: false }));
    }
  };

  const filteredData = useMemo(() => {
    return applications
      .filter((app) => {
        const matchesSearch =
          app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.mobile.includes(searchTerm);
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const timeA = new Date(a.rawCreatedAt || a.createdAt || a.createdDate || 0).getTime() || 0;
        const timeB = new Date(b.rawCreatedAt || b.createdAt || b.createdDate || 0).getTime() || 0;
        if (timeA !== timeB) return timeB - timeA;
        const idA = Number(a.agentCustomerId ?? a.id ?? 0) || 0;
        const idB = Number(b.agentCustomerId ?? b.id ?? 0) || 0;
        return idB - idA;
      });
  }, [applications, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize).map((row, index) => ({
      ...row,
      sno: start + index + 1
    }));
  }, [filteredData, currentPage, pageSize]);

  const columns = [
    { key: 'sno', label: 'S.NO' },
    { key: 'displayId', label: 'APP ID' },
    { key: 'customerName', label: 'CUSTOMER NAME' },
    { key: 'mobile', label: 'MOBILE' },
    { key: 'loanType', label: 'LOAN PURPOSE' },
    { key: 'amount', label: 'AMOUNT' },
    { key: 'agentName', label: 'FIELD AGENT' },
    { key: 'createdDate', label: 'DATE' },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => (
        <div className="new-apps-status-cell">
          <StatusBadge
            status={row.status}
            label={row.status === 'Logged to HO' ? 'Logged to HO' : undefined}
          />
        </div>
      ),
    },
    {
      key: 'action',
      label: 'ACTIONS',
      render: (row) => {
        let btnText = 'Verify Now';
        if (row.status === 'Logged to HO') btnText = 'View Details';
        if (row.status === 'Returned') btnText = 'Review Return';
        const applicationId = row.agentCustomerId || row.id;

        const handleActionClick = async () => {
          if (row.status === 'Returned') {
            setSelectedReturnApp(row);
            setSelectedFiles({});
            setRejectionFeedback({});
            return;
          }

          if (row.status === 'New' || btnText === 'Verify Now') {
            try {
              const getRes = await fetch(`${API_BASE}/AgentAddCustomer/${applicationId}`);
              if (getRes.ok) {
                const data = await getRes.json();
                const cust = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
                if (cust && Number(cust.status ?? cust.Status ?? 0) === 0) {
                  const payload = {
                    ...cust,
                    status: 1,
                  };
                  const putRes = await fetch(`${API_BASE}/AgentAddCustomer/${applicationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  if (!putRes.ok && putRes.status !== 204) {
                    console.error(`Failed to update status to Pending (${putRes.status})`);
                  }
                }
              }
            } catch (err) {
              console.error('Failed to update status to Pending:', err);
            }
          }
          navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', applicationId));
        };

        return (
          <div className="new-apps-actions-cell">
            <Button
              size="sm"
              variant={row.status === 'Returned' ? 'primary' : 'primary'}
              onClick={handleActionClick}
            >
              {btnText}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="listing-page-wrapper">
      <div className="panel listing-card-full">
        <ErrorPopup
          show={!!errorPopup}
          title="Application List Error"
          message={errorPopup}
          onClose={() => setErrorPopup('')}
        />
        {isLoading && (
          <div style={{ marginBottom: '12px', color: '#64748b', fontSize: '14px' }}>
            Loading applications...
          </div>
        )}
        <div className="filter-bar">
          <div className="search-box">
            {SearchIcon && <SearchIcon size={16} className="search-icon" />}
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, Customer or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-align-center gap-3">
            {FilterIcon && <FilterIcon size={16} className="text-muted" />}
            <div style={{ width: '180px' }}>
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'New', label: 'New' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Under Review', label: 'Under Review' },
                  { value: 'Logged to HO', label: 'Logged to HO' },
                  { value: 'Returned', label: 'Returned' },
                ]}
                placeholder={null}
              />
            </div>
          </div>
        </div>

        <div className="listing-table-flex">
          <DataTable columns={columns} data={paginatedData} rowKeyField="id" className="rm-new-applications-table" />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={filteredData.length}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      </div>

      {/* Returned Application Review & Correction Modal */}
      {selectedReturnApp && (
        <Modal
          show={Boolean(selectedReturnApp)}
          onHide={() => {
            setSelectedReturnApp(null);
            setSelectedFiles({});
            setRejectionFeedback({});
          }}
          title="Returned Application — Document Correction"
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const appId = selectedReturnApp.agentCustomerId || selectedReturnApp.id;
                  navigate(ROUTES.APPLICATION_DETAILS.replace(':applicationId', appId));
                }}
              >
                Open Full Application
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedReturnApp(null);
                  setSelectedFiles({});
                  setRejectionFeedback({});
                }}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="return-modal-header-info">
            <div>
              <div className="return-modal-cust-name">{selectedReturnApp.customerName}</div>
              <div className="return-modal-app-id">Application #{selectedReturnApp.displayId} • {selectedReturnApp.mobile}</div>
            </div>
            <StatusBadge status="Returned" />
          </div>

          <div className="return-rejections-list">
            {(selectedReturnApp.rejections || []).map((rej) => {
              const rejId = rej.backOfficeDocumentRejectionId ?? rej.BackOfficeDocumentRejectionId ?? rej.id;
              const docLabel = getRejectedDocumentLabel(rej);
              const isResubmitted = (rej.status ?? rej.Status) === 'Resubmitted';
              const isSubmitting = isSubmittingRejection[rejId];
              const feedback = rejectionFeedback[rejId];

              return (
                <div
                  key={rejId}
                  className={`return-rejection-card ${isResubmitted ? 'is-resubmitted' : ''}`}
                >
                  <div className="return-rejection-card-header">
                    <div className="return-doc-type-badge">
                      {isResubmitted ? '✓' : '⚠️'} {docLabel}
                    </div>
                    <span className="return-rejection-date">
                      {(rej.createdAt || rej.CreatedAt) ? `Returned on: ${formatDate(rej.createdAt || rej.CreatedAt)}` : ''}
                    </span>
                  </div>

                  <div className="return-rejection-remarks-box">
                    <div className="return-rejection-remarks-label">Back Office Rejection Remarks</div>
                    <p className="return-rejection-remarks-text">{(rej.rejectionRemarks || rej.RejectionRemarks) || 'Document rejected. Please provide a clear updated copy.'}</p>
                  </div>

                  {!isResubmitted ? (
                    <div className="return-upload-section">
                      <label className="return-upload-label" htmlFor={`return-file-input-${rejId}`}>
                        Select Replacement Document (PDF, JPEG, PNG, ZIP):
                      </label>
                      <input
                        id={`return-file-input-${rejId}`}
                        type="file"
                        className="return-file-input"
                        accept="image/*,application/pdf,.zip"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setSelectedFiles((prev) => ({ ...prev, [rejId]: f }));
                          if (rejectionFeedback[rejId]) {
                            setRejectionFeedback((prev) => ({ ...prev, [rejId]: null }));
                          }
                        }}
                      />

                      <div className="return-card-actions">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={!selectedFiles[rejId] || isSubmitting}
                          onClick={() => handleResubmitDocument(rej)}
                        >
                          {isSubmitting ? 'Resubmitting...' : 'Upload & Resubmit to Back Office'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#166534', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✓ Successfully Resubmitted — Awaiting Back Office verification</span>
                    </div>
                  )}

                  {feedback && (
                    <div className={`return-modal-feedback ${feedback.type === 'error' ? 'is-error' : 'is-success'}`}>
                      {feedback.message}
                    </div>
                  )}
                </div>
              );
            })}

            {(!selectedReturnApp.rejections || selectedReturnApp.rejections.length === 0) && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                No active document rejection records found for this application.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
