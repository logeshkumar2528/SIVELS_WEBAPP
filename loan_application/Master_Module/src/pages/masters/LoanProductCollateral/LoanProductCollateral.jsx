import { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Edit, Trash2, Shield } from 'lucide-react';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { getLoanProductCollaterals } from '../../../api/masters/loanProductCollateralApi';
import { LoanProductCollateralForm } from './LoanProductCollateralForm';
import { LoanProductCollateralDeleteConfirm } from './LoanProductCollateralDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './LoanProductCollateral.css';


export function LoanProductCollateral() {
  const [collaterals, setCollaterals] = useState([]);
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
  const hasFetchedRef = useRef(false);

  const fetchCollaterals = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getLoanProductCollaterals();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setCollaterals(data);
    } catch (error) {
      console.error('Failed to fetch loan product collaterals:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchCollaterals();
  }, []);

  // Client-side filtering (search only — no isActive filter)
  const filteredCollaterals = useMemo(() => {
    return collaterals.filter((item) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.productName?.toLowerCase().includes(term) ||
        (item.isCollateralRequired ? 'collateral required' : 'collateral not required').includes(term)
      );
    });
  }, [collaterals, searchTerm]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredCollaterals.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCollaterals.slice(startIndex, startIndex + pageSize);
  }, [filteredCollaterals, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.loanProductCollateralId) {
      console.error('Invalid record or missing loanProductCollateralId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.loanProductCollateralId) {
      console.error('Invalid record or missing loanProductCollateralId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Shield size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Loan Product Collateral</h1>
          <p className="masters-page-description">
            Manage collateral requirements for loan products.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Loan Product or Collateral status..."
          />
        </div>
        <div className="masters-page-actions-area">
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={fetchCollaterals}
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
            <Shield size={18} />
            <span>Add Collateral</span>
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
            <p className="master-table-error">Failed to load loan product collateral data.</p>
          </div>
        ) : filteredCollaterals.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No loan product collateral records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Loan Product</th>
                  <th className="master-table-th">Collateral Required</th>
                  <th className="master-table-th">Created Date</th>
                  <th className="master-table-th">Modified Date</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((collateral) => (
                  <tr key={collateral.loanProductCollateralId} className="master-table-row">
                    <td className="master-table-td">{collateral.productName}</td>
                    <td className="master-table-td">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontSize: 'var(--font-size-xs, 0.75rem)',
                          fontWeight: 'var(--font-weight-medium)',
                          backgroundColor: collateral.isCollateralRequired
                            ? 'rgba(218,30,40,0.1)'
                            : 'rgba(36,161,72,0.1)',
                          color: collateral.isCollateralRequired
                            ? 'var(--color-danger)'
                            : 'var(--color-success, #24a148)',
                        }}
                      >
                        {collateral.isCollateralRequired
                          ? 'Collateral Required'
                          : 'Collateral Not Required'}
                      </span>
                    </td>
                    <td className="master-table-td">
                      {formatDateTime(collateral.createdAt)}
                    </td>
                    <td className="master-table-td">
                      {formatDateTime(collateral.modifiedAt)}
                    </td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(collateral)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(collateral)}
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

        {!isLoading && !isError && filteredCollaterals.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredCollaterals.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <LoanProductCollateralForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchCollaterals}
        initialData={editingRecord}
      />

      <LoanProductCollateralDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchCollaterals}
        record={deletingRecord}
      />
    </div>
  );
}
