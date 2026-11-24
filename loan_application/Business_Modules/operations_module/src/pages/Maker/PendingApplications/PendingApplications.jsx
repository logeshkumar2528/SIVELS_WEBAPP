import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthedObjectUrl from '../../../../../../Core/src/auth/useAuthedObjectUrl';
import { resolveApiUrl } from '../../../../../../Core/src/api/apiConfig';
import OperationsLayout from '../../../layouts/OperationsLayout';
import OperationsDocumentViewer from '../../../components/OperationsDocumentViewer';
import { ROUTES } from '../../../config/routeConfig';
import operationsApplicationService from '../../../services/operationsApplicationService';
import './PendingApplications.css';

const PAGE_SIZE = 10;

function normalizeApplication(record) {
  if (!record || record.agentCustomerId === undefined || record.agentCustomerId === null) return null;
  return {
    ...record,
    agentCustomerId: String(record.agentCustomerId),
    fullName: String(record.fullName || '').trim(),
    loanAccountNumber: record.loanAccountNumber == null ? '' : String(record.loanAccountNumber),
    operationsStatus: record.operationsStatus == null ? '' : String(record.operationsStatus),
    profileImagePath: record.profileImagePath == null ? '' : String(record.profileImagePath),
  };
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.title || error?.message || fallback;
}

function getOperationsStatusLabel(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PENDING') return 'Pending';
  if (normalized === 'IN_PROGRESS' || normalized === 'IN PROGRESS') return 'In Progress';
  return status || 'Pending';
}

function ProfileImage({ application }) {
  const [hasError, setHasError] = useState(false);
  const imagePath = application.profileImagePath.trim();
  const imageUrl = imagePath
    ? resolveApiUrl(`/ApplicationKYCDocuments/download?path=${encodeURIComponent(imagePath)}`)
    : '';
  const authenticatedImageUrl = useAuthedObjectUrl(imageUrl);
  const initials = application.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  useEffect(() => setHasError(false), [imageUrl]);

  if (!authenticatedImageUrl || hasError) {
    return <span className="operations-new-applications-avatar-fallback" aria-hidden="true">{initials || '—'}</span>;
  }

  return <img className="operations-new-applications-avatar" src={authenticatedImageUrl} alt="" onError={() => setHasError(true)} />;
}

function DocumentAction({ label, onClick }) {
  return (
    <button type="button" className="operations-new-applications-document-button" onClick={onClick}>
      {label}
    </button>
  );
}

export default function PendingApplications() {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [document, setDocument] = useState(null);

  const loadApplications = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      const records = await operationsApplicationService.getPendingApplications();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setApplications(records.map(normalizeApplication).filter(Boolean));
    } catch (loadError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setApplications([]);
      setError(getErrorMessage(loadError, 'Unable to load Pending Applications.'));
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadApplications();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadApplications]);

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter((application) => (
      application.fullName.toLowerCase().includes(term) ||
      application.loanAccountNumber.toLowerCase().includes(term)
    ));
  }, [applications, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / PAGE_SIZE));
  const pageRows = filteredApplications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setCurrentPage(1), [searchTerm]);
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openDocument = (application, type) => setDocument({ application, type });

  return (
    <OperationsLayout title="Pending Applications" subtitle="Applications assigned to Operations Maker">
      <div className="operations-new-applications-page">
        <div className="operations-new-applications-heading">
          <div>
            <p className="operations-new-applications-eyebrow">OPERATIONS MAKER</p>
            <h2>Pending Applications</h2>
            <p>Continue verification for applications already assigned to you.</p>
          </div>
          <button type="button" className="operations-new-applications-refresh" onClick={loadApplications} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <section className="operations-new-applications-card" aria-label="Pending Applications list">
          <div className="operations-new-applications-toolbar">
            <label className="operations-new-applications-search">
              <Search size={16} aria-hidden="true" />
              <span className="operations-new-applications-sr-only">Search applications</span>
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search customer name or loan account number" aria-label="Search by customer name or loan account number" />
            </label>
            <span className="operations-new-applications-count">Showing {filteredApplications.length} of {applications.length}</span>
          </div>

          {error ? (
            <div className="operations-new-applications-state operations-new-applications-state--error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={loadApplications} disabled={loading}>Retry</button>
            </div>
          ) : loading ? (
            <div className="operations-new-applications-state" role="status">Loading Pending Applications…</div>
          ) : (
            <>
              <div className="operations-new-applications-table-wrap">
                <table className="operations-new-applications-table">
                  <thead>
                    <tr>
                      <th scope="col">Loan Account Number</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Status</th>
                      <th scope="col">View Form</th>
                      <th scope="col">Recommendation Sheet</th>
                      <th scope="col">Sanction Letter</th>
                      <th scope="col">Action — Continue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((application) => (
                      <tr key={application.agentCustomerId}>
                        <td>{application.loanAccountNumber || '—'}</td>
                        <td><div className="operations-new-applications-customer"><ProfileImage application={application} /><span>{application.fullName || '—'}</span></div></td>
                        <td><span className="operations-new-applications-status-chip">{getOperationsStatusLabel(application.operationsStatus)}</span></td>
                        <td><DocumentAction label="View" onClick={() => openDocument(application, 'form')} /></td>
                        <td><DocumentAction label="View" onClick={() => openDocument(application, 'recommendation')} /></td>
                        <td><DocumentAction label="View" onClick={() => openDocument(application, 'sanction')} /></td>
                        <td><button type="button" className="operations-new-applications-verify-button" onClick={() => navigate(`${ROUTES.MAKER_LOAN_BASIC_DETAILS}?applicationId=${encodeURIComponent(application.agentCustomerId)}`)}>Continue</button></td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && <tr><td colSpan={7} className="operations-new-applications-empty">{applications.length === 0 ? 'No pending applications are available.' : 'No applications match your search.'}</td></tr>}
                  </tbody>
                </table>
              </div>
              {filteredApplications.length > 0 && (
                <div className="operations-new-applications-pagination" aria-label="Applications pagination">
                  <button type="button" onClick={() => setCurrentPage((page) => page - 1)} disabled={currentPage === 1}>Previous</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage((page) => page + 1)} disabled={currentPage === totalPages}>Next</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      {document && <OperationsDocumentViewer application={document.application} type={document.type} onClose={() => setDocument(null)} />}
    </OperationsLayout>
  );
}
