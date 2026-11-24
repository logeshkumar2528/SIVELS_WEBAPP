import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../../Core/src/api/apiFetch';
import { API_BASE_URL } from '../../../../Core/src/api/apiConfig';
import { getAccessToken } from '../../../../Core/src/auth/tokenStore';
import AuthImage from '../../../../Core/src/auth/AuthImage';
import { getProfileImageUrl } from '../../../../Core/src/utils/profileImageHelper';
import { ExecutiveEmployeeRecordModal } from '../PeopleDirectory/PeopleDirectoryPage';
import '../PeopleDirectory/PeopleDirectory.css';
import './InvestorDirectory.css';

const unwrap = (v) => (Array.isArray(v) ? v : v?.data || v?.value || []);
const read = (r, keys, fallback = '—') =>
  keys.map((k) => r?.[k]).find((v) => v !== undefined && v !== null && v !== '') ?? fallback;

export default function InvestorDirectory() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    apiFetch(`${API_BASE_URL}/InvestorsMaster`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Unable to load investors.'))))
      .then((d) => setRecords(unwrap(d)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
    type: 'Investor',
  });

  const handlePreviewDocument = (title, rawPath, role, entityId, version) => {
    if (String(title).toLowerCase().includes('profile') || String(title).toLowerCase().includes('image')) {
      setPreviewImage({ title, url: getProfileImageUrl('Investor', entityId, version) });
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
                filtered.map((r, i) => (
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
                      <span className={`investor-status ${r.isActive === false ? 'inactive' : 'active'}`}>
                        {r.isActive === false ? 'Inactive' : 'Active'}
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
                      </div>
                    </td>
                  </tr>
                ))
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
          <section
            className="exec-record-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Profile image preview"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxWidth: 560, padding: 24 }}
          >
            <button type="button" onClick={() => setPreviewImage(null)} style={{ display: 'block', marginLeft: 'auto' }}>
              Close
            </button>
            <AuthImage
              src={previewImage.url}
              alt={previewImage.title}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', margin: '20px auto', objectFit: 'contain' }}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
