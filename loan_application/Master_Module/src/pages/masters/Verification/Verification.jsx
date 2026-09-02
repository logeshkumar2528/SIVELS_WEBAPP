import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Edit, Trash2, ShieldCheck } from 'lucide-react';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { getVerifications } from '../../../api/masters/verificationApi';
import { VerificationForm } from './VerificationForm';
import { VerificationDeleteConfirm } from './VerificationDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './Verification.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All' },
];

export function Verification() {
  const [verifications, setVerifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchVerifications = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getVerifications();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setVerifications(data);
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  // Client-side filtering
  const filteredVerifications = useMemo(() => {
    return verifications.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.verificationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.verificationName?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [verifications, searchTerm]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredVerifications.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredVerifications.slice(startIndex, startIndex + pageSize);
  }, [filteredVerifications, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.verificationId) {
      console.error('Invalid record or missing verificationId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.verificationId) {
      console.error('Invalid record or missing verificationId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <ShieldCheck size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Verification</h1>
          <p className="masters-page-description">
            Manage verification configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Verification Code or Verification Name..."
          />
        </div>
        <div className="masters-page-actions-area">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={fetchVerifications}
            title="Refresh records"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
          </button>
          <button
            type="button"
            className="masters-btn-primary"
            onClick={handleAdd}
          >
            <ShieldCheck size={18} />
            <span>Add Verification</span>
          </button>
        </div>
      </div>

      <div className="masters-page-content">
        {isLoading ? (
          <div className="master-table-state">
            <div className="master-table-spinner" aria-label="Loading records..." />
          </div>
        ) : isError ? (
          <div className="master-table-state">
            <p className="master-table-error">Failed to load verification data.</p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No verification records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Verification Code</th>
                  <th className="master-table-th">Verification Name</th>
                  <th className="master-table-th">Created Date</th>
                  <th className="master-table-th">Modified Date</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((verification) => (
                  <tr key={verification.verificationId} className="master-table-row">
                    <td className="master-table-td">{verification.verificationCode}</td>
                    <td className="master-table-td">{verification.verificationName}</td>
                    <td className="master-table-td">{formatDateTime(verification.createdAt)}</td>
                    <td className="master-table-td">{formatDateTime(verification.modifiedAt)}</td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(verification)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(verification)}
                          aria-label="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && filteredVerifications.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredVerifications.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <VerificationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchVerifications}
        initialData={editingRecord}
      />

      <VerificationDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchVerifications}
        record={deletingRecord}
      />
    </div>
  );
}
