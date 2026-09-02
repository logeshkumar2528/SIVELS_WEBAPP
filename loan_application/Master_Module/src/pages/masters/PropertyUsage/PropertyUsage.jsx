import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Edit, Trash2, Key } from 'lucide-react';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getPropertyUsages } from '../../../api/masters/propertyUsageApi';
import { PropertyUsageForm } from './PropertyUsageForm';
import { PropertyUsageDeleteConfirm } from './PropertyUsageDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './PropertyUsage.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function PropertyUsage() {
  const [propertyUsages, setPropertyUsages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchPropertyUsages = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getPropertyUsages();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setPropertyUsages(data);
    } catch (error) {
      console.error('Failed to fetch property usages:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPropertyUsages();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === '1';

  // Client-side filtering
  const filteredPropertyUsages = useMemo(() => {
    return propertyUsages.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.propertyUsageCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.propertyUsageName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === 'all'
          ? true
          : statusFilterLower === 'active'
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [propertyUsages, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredPropertyUsages.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPropertyUsages.slice(startIndex, startIndex + pageSize);
  }, [filteredPropertyUsages, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.propertyUsageId) {
      console.error('Invalid record or missing propertyUsageId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.propertyUsageId) {
      console.error('Invalid record or missing propertyUsageId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Key size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Property Usage</h1>
          <p className="masters-page-description">
            Manage property usage configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Code or Name..."
          />
        </div>
        <div className="masters-page-actions-area">
          <MasterFilter
            value={filterStatus}
            onChange={setFilterStatus}
            options={FILTER_OPTIONS}
          />
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={fetchPropertyUsages}
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
            <Key size={18} />
            <span>Add Usage</span>
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
            <p className="master-table-error">Failed to load property usage data.</p>
          </div>
        ) : filteredPropertyUsages.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No property usage records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Property Usage Code</th>
                  <th className="master-table-th">Property Usage Name</th>
                  <th className="master-table-th">Created Date</th>
                  <th className="master-table-th">Modified Date</th>
                  <th className="master-table-th">Status</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((usage) => (
                  <tr key={usage.propertyUsageId} className="master-table-row">
                    <td className="master-table-td">{usage.propertyUsageCode}</td>
                    <td className="master-table-td">{usage.propertyUsageName}</td>
                    <td className="master-table-td">{formatDateTime(usage.createdAt)}</td>
                    <td className="master-table-td">{formatDateTime(usage.modifiedAt)}</td>
                    <td className="master-table-td">
                      <MasterStatusBadge status={usage.isActive} />
                    </td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(usage)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(usage)}
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

        {!isLoading && !isError && filteredPropertyUsages.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredPropertyUsages.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <PropertyUsageForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchPropertyUsages}
        initialData={editingRecord}
      />

      <PropertyUsageDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchPropertyUsages}
        record={deletingRecord}
      />
    </div>
  );
}
