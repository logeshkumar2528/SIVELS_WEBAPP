import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Edit, Trash2, Star } from 'lucide-react';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getReligions } from '../../../api/masters/religionApi';
import { ReligionForm } from './ReligionForm';
import { ReligionDeleteConfirm } from './ReligionDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './Religion.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function Religion() {
  const [religions, setReligions] = useState([]);
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

  const fetchReligions = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getReligions();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setReligions(data);
    } catch (error) {
      console.error('Failed to fetch religions:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReligions();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === '1';

  // Client-side filtering
  const filteredReligions = useMemo(() => {
    return religions.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.religionCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.religionName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === 'all'
          ? true
          : statusFilterLower === 'active'
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [religions, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredReligions.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReligions.slice(startIndex, startIndex + pageSize);
  }, [filteredReligions, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.religionId) {
      console.error('Invalid record or missing religionId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.religionId) {
      console.error('Invalid record or missing religionId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Star size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Religion</h1>
          <p className="masters-page-description">
            Manage religion configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Religion Code or Name..."
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
            onClick={fetchReligions}
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
            <Star size={18} />
            <span>Add Religion</span>
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
            <p className="master-table-error">Failed to load religion data.</p>
          </div>
        ) : filteredReligions.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No religion records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Religion Code</th>
                  <th className="master-table-th">Religion Name</th>
                  <th className="master-table-th">Created Date</th>
                  <th className="master-table-th">Modified Date</th>
                  <th className="master-table-th">Status</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((religion) => (
                  <tr key={religion.religionId} className="master-table-row">
                    <td className="master-table-td">{religion.religionCode}</td>
                    <td className="master-table-td">{religion.religionName}</td>
                    <td className="master-table-td">{formatDateTime(religion.createdAt)}</td>
                    <td className="master-table-td">{formatDateTime(religion.modifiedAt)}</td>
                    <td className="master-table-td">
                      <MasterStatusBadge status={religion.isActive} />
                    </td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(religion)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(religion)}
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

        {!isLoading && !isError && filteredReligions.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredReligions.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <ReligionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchReligions}
        initialData={editingRecord}
      />

      <ReligionDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchReligions}
        record={deletingRecord}
      />
    </div>
  );
}
