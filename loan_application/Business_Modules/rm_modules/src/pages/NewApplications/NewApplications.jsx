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
import './NewApplications.css';
import { buildApplicationDisplayId } from '../applicationWizard/flowUtils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';

const normalizeMobile = (value) => String(value || '').replace(/\D/g, '');

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return `Rs. ${Number(value).toLocaleString('en-IN')}`;
};

export const getRejectedDocumentLabel = (rejection) => {
  if (!rejection) return 'Document';
  const rawType = String(rejection.rejectedDocumentType || '').toUpperCase().trim();

  const isCoApp =
    rawType.includes('CO_APPLICANT') ||
    rawType.includes('COAPPLICANT') ||
    rawType.startsWith('CO_') ||
    rawType.startsWith('CO-');

  const isProfile = rawType.includes('PROFILE') || rawType.includes('PHOTO') || rawType.includes('IMAGE');
  const isAadhaar = rawType.includes('AADHAAR') || rawType.includes('ADHAAR') || rawType.includes('UID');
  const isPan = rawType.includes('PAN');
  const isZip = rawType.includes('ZIP') || rawType.includes('MANUAL');

  if (isCoApp) {
    if (isProfile) return 'Co-Applicant Profile Image';
    if (isAadhaar) return 'Co-Applicant Aadhaar Card';
    if (isPan) return 'Co-Applicant PAN Card';
    if (isZip) return 'Co-Applicant ZIP File';
    return `Co-Applicant ${rejection.rejectedDocumentType || 'Document'}`;
  } else {
    if (isProfile) return 'Applicant Profile Image';
    if (isAadhaar) return 'Applicant Aadhaar Card';
    if (isPan) return 'Applicant PAN Card';
    if (isZip) return 'Applicant ZIP File';
    return `Applicant ${rejection.rejectedDocumentType || 'Document'}`;
  }
};

const mapBackendApplication = (item, index, agentsById = {}, rejections = []) => {
  const applicationId = item.applicationId || item.applicationNumber || item.agentCustomerId || item.customerId || `${index + 1}`;
  const agentId = item.agentId || item.AgentId || null;
  const agent = agentsById[String(agentId)] || {};
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
    loanType: item.loanPurposeName || item.loanType || '',
    amount: formatCurrency(item.expectedLoanAmount ?? item.amount),
    agentName: item.agentName || agent.fullName || agent.FullName || (agentId ? '' : 'Direct (RM)'),
    createdDate: formatDate(item.createdAt || item.createdDate),
    status: normalizedStatus,
    rawStatus: normalizedStatus,
    agentCustomerId: item.agentCustomerId || item.customerId || null,
    agentId,
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

      const [agentRes, customerRes, rejectionsRes, appProdRes] = await Promise.all([
        fetch(`${API_BASE}/AgentMaster`, { headers: authHeaders }),
        fetch(`${API_BASE}/AgentAddCustomer`, { headers: authHeaders }),
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

      const matchedAgents = filterAgentsForRm(resolveApiArray(agentsData), rmContext.rmId);
      const agentsById = matchedAgents.reduce((result, agent) => {
        const id = agent.agentId || agent.AgentId;
        if (id !== undefined && id !== null) result[String(id)] = agent;
        return result;
      }, {});
      const agentIds = buildAllowedAgentIdSet(matchedAgents);

      const allCustomers = resolveApiArray(customersData);
      const filtered = allCustomers.filter((item) => {
        const rowAgentId = Number(item.agentId || item.AgentId);
        const rowCustId = String(item.agentCustomerId || item.customerId || '');
        
        // 1. Normal agent-sourced customer: belongs to an agent assigned to this RM
        const isAgentMapped = Boolean(rowAgentId && agentIds.has(rowAgentId));

        // 2. Promoted RM-sourced customer (agentId is null): belongs directly to this RM
        const isRmDirectOwned = (item.agentId === null || item.agentId === undefined) && (
          rmOwnedCustomerIds.has(rowCustId) ||
          Number(item.rmId || item.RMId) === Number(rmContext.rmId) ||
          (Number(item.createdBy || item.CreatedBy) === Number(rmContext.rmId) && !item.agentId)
        );

        // 3. Active rejection for this RM
        const hasActiveRejection = Boolean(activeRejectionsByCustId[rowCustId]);

        return isAgentMapped || isRmDirectOwned || hasActiveRejection;
      });

      const mapped = filtered.map((item, index) => {
        const custId = String(item.agentCustomerId || item.customerId || '');
        const itemRejections = activeRejectionsByCustId[custId] || [];
        return mapBackendApplication(item, index, agentsById, itemRejections);
      });

      setApplications(mapped);
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
    const rejId = rejection.backOfficeDocumentRejectionId;
    const file = selectedFiles[rejId];
    if (!file) {
      setRejectionFeedback((prev) => ({
        ...prev,
        [rejId]: { type: 'error', message: 'Please select a replacement document file before resubmitting.' }
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
      const rawType = String(rejection.rejectedDocumentType || '').toUpperCase().trim();
      const isCoApp =
        rawType.includes('CO_APPLICANT') ||
        rawType.includes('COAPPLICANT') ||
        rawType.startsWith('CO_') ||
        rawType.startsWith('CO-');

      const isProfile = rawType.includes('PROFILE') || rawType.includes('PHOTO') || rawType.includes('IMAGE');
      const isAadhaar = rawType.includes('AADHAAR') || rawType.includes('ADHAAR') || rawType.includes('UID');
      const isPan = rawType.includes('PAN');
      const isZip = rawType.includes('ZIP') || rawType.includes('MANUAL');

      // Step 1: Upload replacement document
      if (isCoApp) {
        let route = 'upload';
        if (isAadhaar) route = 'aadhar';
        else if (isPan) route = 'pan';
        else if (isProfile) route = 'profile-image';
        else if (isZip) route = 'upload';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('File', file);

        const uploadUrl = `${API_BASE}/ApplicationKYCDocuments/${rejection.kycDocumentId}/${route}`;
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
          throw new Error(`Failed to upload co-applicant document (${uploadRes.status}): ${errTxt}`);
        }
      } else {
        let docTypeId = 4;
        if (isProfile) docTypeId = 6;
        else if (isAadhaar) docTypeId = 1;
        else if (isPan) docTypeId = 2;
        else if (isZip) docTypeId = 4;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('File', file);
        formData.append('agentCustomerId', String(rejection.agentCustomerId || selectedReturnApp?.agentCustomerId));
        formData.append('AgentCustomerId', String(rejection.agentCustomerId || selectedReturnApp?.agentCustomerId));
        formData.append('documentTypeId', String(docTypeId));
        formData.append('DocumentTypeId', String(docTypeId));
        formData.append('createdBy', String(rmId));
        formData.append('CreatedBy', String(rmId));

        const uploadRes = await fetch(`${API_BASE}/AgentCustomerDocument/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!uploadRes.ok) {
          const errTxt = await uploadRes.text().catch(() => '');
          throw new Error(`Failed to upload applicant document (${uploadRes.status}): ${errTxt}`);
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

      // Update the rejection in selectedReturnApp
      setSelectedReturnApp((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          rejections: (prev.rejections || []).map((r) =>
            r.backOfficeDocumentRejectionId === rejId ? { ...r, status: 'Resubmitted' } : r
          ),
        };
      });

      // Refresh application list
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
    return applications.filter((app) => {
      const matchesSearch =
        app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.mobile.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
      return matchesSearch && matchesStatus;
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
              const rejId = rej.backOfficeDocumentRejectionId;
              const docLabel = getRejectedDocumentLabel(rej);
              const isResubmitted = rej.status === 'Resubmitted';
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
                      {rej.createdAt ? `Returned on: ${formatDate(rej.createdAt)}` : ''}
                    </span>
                  </div>

                  <div className="return-rejection-remarks-box">
                    <div className="return-rejection-remarks-label">Back Office Rejection Remarks</div>
                    <p className="return-rejection-remarks-text">{rej.rejectionRemarks || 'Document rejected. Please provide a clear updated copy.'}</p>
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
