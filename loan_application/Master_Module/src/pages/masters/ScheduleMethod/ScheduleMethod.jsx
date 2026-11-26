import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Layers } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getScheduleMethods } from '../../../api/masters/scheduleMethodApi';
import { ScheduleMethodForm } from './ScheduleMethodForm';
import { ScheduleMethodDeleteConfirm } from './ScheduleMethodDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './ScheduleMethod.css';

const getId = (row) => row?.scheduleMethodId ?? row?.ScheduleMethodId ?? row?.id;
const getCode = (row) => row?.scheduleMethodCode ?? row?.ScheduleMethodCode ?? '';
const getName = (row) => row?.scheduleMethodName ?? row?.ScheduleMethodName ?? '';
const getCreatedAt = (row) => row?.createdAt ?? row?.CreatedAt ?? row?.createdDate;
const getModifiedAt = (row) => row?.modifiedAt ?? row?.ModifiedAt ?? row?.modifiedDate;

const COLUMNS = [
  { key: 'scheduleMethodId', label: 'Schedule Method ID', render: (row) => getId(row) ?? '—' },
  { key: 'scheduleMethodCode', label: 'Schedule Method Code', render: (row) => getCode(row) || '—' },
  { key: 'scheduleMethodName', label: 'Schedule Method Name', render: (row) => getName(row) || '—' },
  { key: 'isActive', label: 'Status', render: (row) => <MasterStatusBadge status={row.isActive ?? row.IsActive} /> },
  { key: 'createdAt', label: 'Created Date', render: (row) => formatDateTime(getCreatedAt(row)) },
  { key: 'modifiedAt', label: 'Modified Date', render: (row) => formatDateTime(getModifiedAt(row)) },
];

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function ScheduleMethod() {
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
      const response = await getScheduleMethods();
      const records = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setData(records);
    } catch (error) {
      console.error('Failed to fetch schedule methods:', error);
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
          <Layers size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Schedule Method Master</h1>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by ID, code or name..."
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
            <Layers size={18} />
            <span>Add Schedule Method</span>
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

      <ScheduleMethodForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchRecords}
        initialData={editingRecord}
        existingRecords={data}
      />
      <ScheduleMethodDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchRecords}
        record={deletingRecord}
      />
    </div>
  );
}
