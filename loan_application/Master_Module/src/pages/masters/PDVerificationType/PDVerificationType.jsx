import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Calendar, UserCheck } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getPDVerificationTypes } from '../../../api/masters/pdVerificationTypeApi';
import { PDVerificationTypeForm } from './PDVerificationTypeForm';
import { PDVerificationTypeDeleteConfirm } from './PDVerificationTypeDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './PDVerificationType.css';

const COLUMNS = [
  { 
    key: 'pdVerificationTypeCode', 
    label: 'Code',
    render: (row) => <span className="text-code-green">{row.pdVerificationTypeCode}</span>
  },
  { key: 'pdVerificationTypeName', label: 'PD Verification Type' },
  { 
    key: 'createdAt', 
    label: 'Created Date',
    render: (row) => (
      <div className="table-date-cell">
        <Calendar size={14} className="table-date-icon" />
        <span>{formatDateTime(row.createdAt || row.createdDate) || '—'}</span>
      </div>
    )
  },
  { 
    key: 'modifiedAt', 
    label: 'Modified Date',
    render: (row) => {
      const modDate = row.modifiedAt || row.modifiedDate;
      return (
        <div className="table-date-cell">
          {modDate ? <Calendar size={14} className="table-date-icon" /> : null}
          <span>{formatDateTime(modDate) || '—'}</span>
        </div>
      );
    }
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

export function PDVerificationType() {
  const [data, setData] = useState([]);
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

  const fetchPDVerificationTypes = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getPDVerificationTypes();
      const records = Array.isArray(response) 
        ? response 
        : (response?.data || response?.value || []);
      setData(records);
    } catch (error) {
      console.error('Failed to fetch PD verification types:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPDVerificationTypes();
  }, []);

  // Client-side filtering: Order -> Search -> Filter -> Pagination
  const filteredData = useMemo(() => {
    let result = data;
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.pdVerificationTypeName?.toLowerCase().includes(lowerSearch) ||
        item.pdVerificationTypeCode?.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterStatus !== 'All') {
      const targetStatus = filterStatus === 'Active';
      result = result.filter(item => item.isActive === targetStatus);
    }
    
    return result;
  }, [data, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.pdVerificationTypeId) {
      console.error('Invalid record or missing pdVerificationTypeId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.pdVerificationTypeId) {
      console.error('Invalid record or missing pdVerificationTypeId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <UserCheck size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">PD Verification Types</h1>
          <p className="masters-page-description">
            Manage Personal Discussion (PD) verification types configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by PD Verification Type or Code..."
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
            className="masters-btn-secondary icon-btn" 
            onClick={fetchPDVerificationTypes}
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
            <UserCheck size={18} />
            <span>Add PD Verification Type</span>
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
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <PDVerificationTypeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchPDVerificationTypes}
        initialData={editingRecord}
      />

      <PDVerificationTypeDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchPDVerificationTypes}
        record={deletingRecord}
      />
    </div>
  );
}
