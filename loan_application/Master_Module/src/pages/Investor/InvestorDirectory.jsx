import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Eye, Pencil, Plus, Power, RefreshCw, Search, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../../Core/src/api/apiFetch';
import { API_BASE_URL } from '../../../../Core/src/api/apiConfig';
import { getAccessToken } from '../../../../Core/src/auth/tokenStore';
import AuthImage from '../../../../Core/src/auth/AuthImage';
import { getProfileImageUrl } from '../../../../Core/src/utils/profileImageHelper';
import { deactivateInvestor } from '../../api/investorApi';
import { MasterModal } from '../../components/masters/MasterModal/MasterModal';
import { ExecutiveEmployeeRecordModal } from '../PeopleDirectory/PeopleDirectoryPage';
import '../PeopleDirectory/PeopleDirectory.css';
import '../masters/StatusRole/StatusRole.css';
import './InvestorDirectory.css';

const unwrap = (v) => (Array.isArray(v) ? v : v?.data || v?.value || []);
const read = (r, keys, fallback = '—') =>
  keys.map((k) => r?.[k]).find((v) => v !== undefined && v !== null && v !== '') ?? fallback;

const resolveIsActive = (item) => {
  const rawActive = item?.isActive ?? item?.IsActive;
  if (typeof rawActive === 'boolean') return rawActive;
  if (typeof rawActive === 'number') return rawActive !== 0;
  if (typeof rawActive === 'string') {
    const text = rawActive.trim().toLowerCase();
    if (['inactive', 'false', '0', 'deactivated', 'disabled'].includes(text)) return false;
    if (['active', 'true', '1', 'enabled'].includes(text)) return true;
  }
  return true;
};

const getDeactivationErrorMessage = (error, fallback = 'Unable to deactivate this investor.') =>
  error?.response?.data?.message
  || error?.response?.data?.title
  || error?.message
  || fallback;

export default function InvestorDirectory() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [deactivationTarget, setDeactivationTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadInvestors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getAccessToken();
      const response = await apiFetch(`${API_BASE_URL}/InvestorsMaster`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Unable to load investors.');
      const data = await response.json();
      setRecords(unwrap(data));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load investors.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvestors();
  }, [loadInvestors]);

  const filtered = records.filter((r) =>
    `${read(r, ['investorCode', 'InvestorCode'], '')} ${read(r, ['fullName', 'FullName'], '')} ${read(r, ['mobileNumber', 'MobileNumber'], '')} ${read(r, ['emailAddress', 'EmailAddress'], '')}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const normalize = (r) => ({
    ...r,
    id: read(r, ['investorId', 'InvestorId', 'id']),
    name: read(r, ['fullName', 'FullName']),
    fullName: read(r, ['fullName', 'FullName']),
    investorCode: read(r, ['investorCode', 'InvestorCode']),
    email: read(r, ['emailAddress', 'EmailAddress']),
    emailAddress: read(r, ['emailAddress', 'EmailAddress']),
    phone: read(r, ['mobileNumber', 'MobileNumber']),
    mobileNumber: read(r, ['mobileNumber', 'MobileNumber']),
    branch: read(r, ['branch', 'Branch', 'branchName', 'BranchName']),
    dateJoined: read(r, ['dateJoined', 'DateJoined']),
    accountNumber: read(r, ['accountNumber', 'AccountNumber']),
    ifscCode: read(r, ['ifscCode', 'IfscCode']),
    isActive: resolveIsActive(r),
    type: 'Investor',
  });

  const handlePreviewDocument = (title, rawPath, role, entityId, version) => {
    if (String(title).toLowerCase().includes('profile') || String(title).toLowerCase().includes('image')) {
      setPreviewImage({ title, url: getProfileImageUrl('Investor', entityId, version) });
    }
  };

  const confirmDeactivation = async () => {
    const investorId = read(deactivationTarget || {}, ['investorId', 'InvestorId', 'id'], '');
    if (!investorId || deactivating) return;

    setDeactivating(true);
    try {
      await deactivateInvestor(investorId);
      toast.success(`${read(deactivationTarget, ['fullName', 'FullName'], 'Investor')} deactivated successfully.`);
      setDeactivationTarget(null);
      await loadInvestors();
    } catch (requestError) {
      toast.error(getDeactivationErrorMessage(requestError));
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="people-directory-page investor-directory-page">
      <button
        type="button"
        className="people-dir-back-btn"
        onClick={() => navigate('/dashboard')}
        aria-label="Back to Dashboard"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="people-directory-card">
        <div className="people-dir-header">
          <div className="people-dir-heading-row">
            <div className="people-dir-title-wrap">
              <div className="people-dir-title-badge">
                <div className="people-dir-icon green">
                  <Users size={20} />
                </div>
                <h1>Investors</h1>
                <span className="people-dir-count-badge">
                  {records.length} {records.length === 1 ? 'record' : 'records'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate('/create-user?type=investor')}
            >
              <Plus size={16} /> Add user
            </button>
          </div>

          <div className="people-dir-controls">
            <div className="people-dir-search-box">
              <Search size={16} />
              <input
                aria-label="Search investors"
                placeholder="Search investors by name, phone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query ? (
                <button
                  type="button"
                  className="people-dir-search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            {query ? (
              <span className="people-dir-search-badge">
                Filtered: {filtered.length} of {records.length}
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="investor-directory-error" role="status">
            {error}
          </div>
        ) : null}

        <div className="people-dir-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Investor</th>
                <th>Contact</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="empty-table" colSpan="5">
                    Loading investor records…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((r, i) => {
                  const active = resolveIsActive(r);
                  return (
                    <tr key={read(r, ['investorId', 'InvestorId', 'id'], i)}>
                      <td>
                        <strong>{read(r, ['fullName', 'FullName'])}</strong>
                        <small>{read(r, ['investorCode', 'InvestorCode'])}</small>
                      </td>
                      <td>
                        <div>{read(r, ['emailAddress', 'EmailAddress'])}</div>
                        <small>{read(r, ['mobileNumber', 'MobileNumber'])}</small>
                      </td>
                      <td>{read(r, ['branch', 'Branch', 'branchName', 'BranchName'])}</td>
                      <td>
                        <span className={`investor-status ${active ? 'active' : 'inactive'}`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => setSelected(normalize(r))}
                          >
                            <Eye size={15} /> View
                          </button>
                          <button
                            type="button"
                            className="details-button edit-button"
                            onClick={() =>
                              navigate(
                                `/create-user?type=investor&investorId=${read(r, ['investorId', 'InvestorId', 'id'], '')}`
                              )
                            }
                          >
                            <Pencil size={15} /> Edit
                          </button>
                          {active && (
                            <button
                              type="button"
                              className="details-button deactivate-button"
                              onClick={() => setDeactivationTarget(r)}
                            >
                              <Power size={15} /> Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="empty-table" colSpan="5">
                    {query ? 'No matching investors found.' : 'No investor records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <ExecutiveEmployeeRecordModal
          person={selected}
          roleType="Investor"
          onClose={() => setSelected(null)}
          onPreviewDocument={handlePreviewDocument}
        />
      ) : null}

      {previewImage ? (
        <div
          className="exec-record-backdrop"
          role="presentation"
          onMouseDown={() => setPreviewImage(null)}
        >
          <div
            className="exec-record-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="exec-record-header">
              <strong>{previewImage.title || 'Profile Image'}</strong>
              <button type="button" className="people-dir-search-clear" onClick={() => setPreviewImage(null)} aria-label="Close preview">
                <X size={16} />
              </button>
            </div>
            <div className="exec-record-body" style={{ display: 'grid', placeItems: 'center' }}>
              <AuthImage src={previewImage.url} alt={previewImage.title || 'Profile'} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      ) : null}

      <MasterModal
        isOpen={Boolean(deactivationTarget)}
        onClose={() => !deactivating && setDeactivationTarget(null)}
        title="Deactivate Investor"
        subtitle="This action changes the user's active status."
        icon={<Power size={20} />}
      >
        <p style={{ color: '#475569', marginTop: 0 }}>
          Are you sure you want to deactivate{' '}
          <strong>{read(deactivationTarget || {}, ['fullName', 'FullName'], 'this investor')}</strong>?
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={() => setDeactivationTarget(null)}
            disabled={deactivating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="masters-btn-danger"
            onClick={confirmDeactivation}
            disabled={deactivating}
          >
            {deactivating ? <RefreshCw size={16} className="master-spin" /> : <Power size={16} />}
            Deactivate
          </button>
        </div>
      </MasterModal>
    </div>
  );
}
