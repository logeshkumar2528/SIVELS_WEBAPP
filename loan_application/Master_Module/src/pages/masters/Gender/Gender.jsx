import { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getGenders } from '../../../api/masters/genderApi';
import { GenderForm } from './GenderForm';
import { GenderDeleteConfirm } from './GenderDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './Gender.css';

const PAGE_SIZE = 10;

const COLUMNS = [
  { key: 'genderCode', label: 'Gender Code' },
  { key: 'genderName', label: 'Gender Name' },
  { 
    key: 'createdAt', 
    label: 'Created Date',
    render: (row) => formatDateTime(row.createdAt)
  },
  { 
    key: 'modifiedAt', 
    label: 'Modified Date',
    render: (row) => formatDateTime(row.modifiedAt)
  },
  { 
    key: 'isActive', 
    label: 'Status',
    render: (row) => <MasterStatusBadge status={row.isActive} />
  }
];

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export function Gender() {
  const [genders, setGenders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchGenders = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getGenders();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setGenders(data);
    } catch (error) {
      console.error('Failed to fetch genders:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGenders();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === "1";

  // Client-side filtering
  const filteredGenders = useMemo(() => {
    return genders.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.genderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.genderName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === "all"
          ? true
          : statusFilterLower === "active"
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [genders, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredGenders.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredGenders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredGenders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.genderId) {
      console.error('Invalid record or missing genderId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.genderId) {
      console.error('Invalid record or missing genderId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div>
          <h1 className="masters-page-title">Gender</h1>
          <p className="masters-page-description">
            Manage gender configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Gender Code or Gender Name..."
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
            onClick={fetchGenders}
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
            <Plus size={18} />
            <span>Add Gender</span>
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
            <p className="master-table-error">Failed to load gender data.</p>
          </div>
        ) : filteredGenders.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No gender records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Gender Code</th>
                  <th className="master-table-th">Gender Name</th>
                  <th className="master-table-th">Created Date</th>
                  <th className="master-table-th">Modified Date</th>
                  <th className="master-table-th">Status</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((gender) => (
                  <tr key={gender.genderId} className="master-table-row">
                    <td className="master-table-td">{gender.genderCode}</td>
                    <td className="master-table-td">{gender.genderName}</td>
                    <td className="master-table-td">{formatDateTime(gender.createdAt)}</td>
                    <td className="master-table-td">{formatDateTime(gender.modifiedAt)}</td>
                    <td className="master-table-td">
                      <MasterStatusBadge status={gender.isActive} />
                    </td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(gender)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(gender)}
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
        
        {!isLoading && !isError && filteredGenders.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <GenderForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchGenders}
        initialData={editingRecord}
      />

      <GenderDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchGenders}
        record={deletingRecord}
      />
    </div>
  );
}
