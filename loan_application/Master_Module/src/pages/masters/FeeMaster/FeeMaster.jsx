import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Receipt } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getFees } from '../../../api/masters/feeMasterApi';
import { FeeMasterForm } from './FeeMasterForm';
import { FeeMasterDeleteConfirm } from './FeeMasterDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './FeeMaster.css';

const getId = (row) => row?.feeId ?? row?.FeeId ?? row?.id;
const getCode = (row) => row?.feeCode ?? row?.FeeCode ?? '';
const getName = (row) => row?.feeName ?? row?.FeeName ?? '';
const getCreatedAt = (row) => row?.createdAt ?? row?.CreatedAt ?? row?.createdDate;
const getModifiedAt = (row) => row?.modifiedAt ?? row?.ModifiedAt ?? row?.modifiedDate;

const COLUMNS = [
  { key: 'feeId', label: 'Fee ID', render: (row) => getId(row) ?? '—' },
  { key: 'feeCode', label: 'Fee Code', render: (row) => getCode(row) || '—' },
  { key: 'feeName', label: 'Fee Name', render: (row) => getName(row) || '—' },
  { key: 'isActive', label: 'Status', render: (row) => <MasterStatusBadge status={row.isActive ?? row.IsActive} /> },
  { key: 'createdAt', label: 'Created Date', render: (row) => formatDateTime(getCreatedAt(row)) },
  { key: 'modifiedAt', label: 'Modified Date', render: (row) => formatDateTime(getModifiedAt(row)) },
];

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function FeeMaster() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getFees();
      const records = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setData(records);
    } catch (error) {
      console.error('Failed to fetch fees:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredData = useMemo(() => {
    let result = data;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          String(getId(item) ?? '').toLowerCase().includes(lowerSearch) ||
          getName(item).toLowerCase().includes(lowerSearch) ||
          getCode(item).toLowerCase().includes(lowerSearch)
      );
    }
    if (filterStatus !== 'All') {
      const targetStatus = filterStatus === 'Active';
      result = result.filter((item) => (item.isActive ?? item.IsActive) === targetStatus);
    }
    return result;
  }, [data, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleEdit = (row) => {
    if (!getId(row)) return;
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!getId(row)) return;
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <Receipt size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Fee Master</h1>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by fee ID, code or name..."
          />
        </div>
        <div className="masters-page-actions-area">
          <MasterFilter value={filterStatus} onChange={setFilterStatus} options={FILTER_OPTIONS} />
          <button
            type="button"
            className="masters-btn-secondary"
            onClick={fetchRecords}
            title="Refresh records"
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
          </button>
          <button
            type="button"
            className="masters-btn-primary"
            onClick={() => {
              setEditingRecord(null);
              setIsFormOpen(true);
            }}
          >
            <Receipt size={18} />
            <span>Add Fee</span>
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

      <FeeMasterForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchRecords}
        initialData={editingRecord}
        existingRecords={data}
      />
      <FeeMasterDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchRecords}
        record={deletingRecord}
      />
    </div>
  );
}
