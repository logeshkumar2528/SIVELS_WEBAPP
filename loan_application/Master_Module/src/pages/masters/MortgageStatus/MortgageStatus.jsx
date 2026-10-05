import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getMortgageStatuses } from '../../../api/masters/mortgageStatusApi';
import { MortgageStatusForm } from './MortgageStatusForm';
import { MortgageStatusDeleteConfirm } from './MortgageStatusDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './MortgageStatus.css';

const COLUMNS = [
  { key: 'mortgageStatusCode', label: 'Mortgage Status Code' },
  { key: 'mortgageStatusName', label: 'Mortgage Status Name' },
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

export function MortgageStatus() {
  const [mortgageStatuses, setMortgageStatuses] = useState([]);
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

  const fetchMortgageStatuses = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getMortgageStatuses();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setMortgageStatuses(data);
    } catch (error) {
      console.error('Failed to fetch mortgage statuses:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMortgageStatuses();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === '1';

  // Client-side filtering
  const filteredData = useMemo(() => {
    return mortgageStatuses.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.mortgageStatusCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mortgageStatusName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === 'all'
          ? true
          : statusFilterLower === 'active'
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [mortgageStatuses, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize).map((item) => ({
      ...item,
      id: item.mortgageStatusId
    }));
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.mortgageStatusId) {
      console.error('Invalid record or missing mortgageStatusId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.mortgageStatusId) {
      console.error('Invalid record or missing mortgageStatusId:', row);
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
          <h1 className="masters-page-title">Mortgage Status</h1>
          <p className="masters-page-description">
            Manage mortgage status configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Mortgage Status Code or Name..."
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
            onClick={fetchMortgageStatuses}
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
            <span>Add Mortgage Status</span>
          </button>
        </div>
      </div>

      <div className="masters-page-content">
        <MasterTable
          columns={COLUMNS}
          data={paginatedData}
          isLoading={isLoading}
          isError={isError}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {!isLoading && !isError && filteredData.length > 0 && (
          <MasterPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <MortgageStatusForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchMortgageStatuses}
        initialData={editingRecord}
      />

      <MortgageStatusDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchMortgageStatuses}
        record={deletingRecord}
      />
    </div>
  );
}
