import { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, FolderCheck } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getCustomerDocumentTypes } from '../../../api/masters/customerDocumentTypeApi';
import { CustomerDocumentTypeForm } from './CustomerDocumentTypeForm';
import { CustomerDocumentTypeDeleteConfirm } from './CustomerDocumentTypeDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import '../DocumentType/DocumentType.css';

const COLUMNS = [
  { key: 'documentTypeCode', label: 'Category Code' },
  { key: 'documentTypeName', label: 'Category Name' },
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

function normalize(row) {
  return {
    ...row,
    customerDocumentTypeId: row.customerDocumentTypeId ?? row.CustomerDocumentTypeId,
    documentTypeCode: row.documentTypeCode ?? row.DocumentTypeCode ?? '',
    documentTypeName: row.documentTypeName ?? row.DocumentTypeName ?? '',
    isActive: (row.isActive ?? row.IsActive) !== false,
    createdAt: row.createdAt ?? row.CreatedAt,
    modifiedAt: row.modifiedAt ?? row.ModifiedAt,
  };
}

export function CustomerDocumentType() {
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
  const hasFetchedRef = useRef(false);

  const fetchRecords = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getCustomerDocumentTypes();
      const records = Array.isArray(response) ? response : (response.data || response.value || []);
      setData(records.map(normalize));
    } catch (error) {
      console.error('Failed to fetch customer document types:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchRecords();
  }, []);

  const filteredData = useMemo(() => {
    let result = data;

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.documentTypeName?.toLowerCase().includes(lowerSearch) ||
        item.documentTypeCode?.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterStatus !== 'All') {
      const targetStatus = filterStatus === 'Active';
      result = result.filter(item => item.isActive === targetStatus);
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

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row?.customerDocumentTypeId) {
      console.error('Invalid record or missing customerDocumentTypeId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row?.customerDocumentTypeId) {
      console.error('Invalid record or missing customerDocumentTypeId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <FolderCheck size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Customer Document Type Master</h1>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Category..."
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
            onClick={fetchRecords}
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
            <FolderCheck size={18} />
            <span>Add Category</span>
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

      <CustomerDocumentTypeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchRecords}
        initialData={editingRecord}
      />

      <CustomerDocumentTypeDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchRecords}
        record={deletingRecord}
      />
    </div>
  );
}
