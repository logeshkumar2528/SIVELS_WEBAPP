import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Building2 } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getDivisions } from '../../../api/masters/divisionApi';
import { DivisionForm } from './DivisionForm';
import { DivisionDeleteConfirm } from './DivisionDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './Division.css';

const getId = (row) => row?.divisionId ?? row?.DivisionId ?? row?.id;
const getCode = (row) => row?.divisionCode ?? row?.DivisionCode ?? '';
const getName = (row) => row?.divisionName ?? row?.DivisionName ?? '';
const getCreatedAt = (row) => row?.createdAt ?? row?.CreatedAt ?? row?.createdDate;
const getModifiedAt = (row) => row?.modifiedAt ?? row?.ModifiedAt ?? row?.modifiedDate;

const COLUMNS = [
  { key: 'divisionCode', label: 'Code', render: (row) => getCode(row) || '—' },
  { key: 'divisionName', label: 'Division', render: (row) => getName(row) || '—' },
  { key: 'createdAt', label: 'Created Date', render: (row) => formatDateTime(getCreatedAt(row)) },
  { key: 'modifiedAt', label: 'Modified Date', render: (row) => formatDateTime(getModifiedAt(row)) },
  { key: 'isActive', label: 'Status', render: (row) => <MasterStatusBadge status={row.isActive ?? row.IsActive} /> },
];

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function Division() {
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
      const response = await getDivisions();
      const records = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setData(records);
    } catch (error) {
      console.error('Failed to fetch divisions:', error);
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

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Division Master</h1>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search by code or name..." />
        </div>
        <div className="masters-page-actions-area">
          <MasterFilter value={filterStatus} onChange={setFilterStatus} options={FILTER_OPTIONS} />
          <button type="button" className="masters-btn-secondary" onClick={fetchRecords} disabled={isLoading} title="Refresh records">
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
            <Building2 size={18} />
            <span>Add Division</span>
          </button>
        </div>
      </div>

      <div className="masters-page-content">
        <MasterTable
          columns={COLUMNS}
          data={paginatedData}
          isLoading={isLoading}
          isError={isError}
          onEdit={(row) => {
            if (!getId(row)) return;
            setEditingRecord(row);
            setIsFormOpen(true);
          }}
          onDelete={(row) => {
            if (!getId(row)) return;
            setDeletingRecord(row);
            setIsDeleteOpen(true);
          }}
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

      <DivisionForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={fetchRecords} initialData={editingRecord} />
      <DivisionDeleteConfirm isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onSuccess={fetchRecords} record={deletingRecord} />
    </div>
  );
}
