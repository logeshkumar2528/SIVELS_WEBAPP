import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Wallet } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getPaymentMethods } from '../../../api/masters/paymentMethodApi';
import { PaymentMethodForm } from './PaymentMethodForm';
import { PaymentMethodDeleteConfirm } from './PaymentMethodDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './PaymentMethod.css';

const getId = (row) => row?.paymentMethodId ?? row?.PaymentMethodId ?? row?.id;
const getCode = (row) => row?.paymentMethodCode ?? row?.PaymentMethodCode ?? '';
const getName = (row) => row?.paymentMethodName ?? row?.PaymentMethodName ?? '';
const getDescription = (row) => row?.description ?? row?.Description ?? '';
const getCreatedAt = (row) => row?.createdAt ?? row?.CreatedAt ?? row?.createdDate;
const getModifiedAt = (row) => row?.modifiedAt ?? row?.ModifiedAt ?? row?.modifiedDate;

const COLUMNS = [
  { key: 'paymentMethodCode', label: 'Code', render: (row) => getCode(row) || '—' },
  { key: 'paymentMethodName', label: 'Payment Method', render: (row) => getName(row) || '—' },
  { key: 'description', label: 'Description', render: (row) => getDescription(row) || '—' },
  { key: 'createdAt', label: 'Created Date', render: (row) => formatDateTime(getCreatedAt(row)) },
  { key: 'modifiedAt', label: 'Modified Date', render: (row) => formatDateTime(getModifiedAt(row)) },
  { key: 'isActive', label: 'Status', render: (row) => <MasterStatusBadge status={row.isActive ?? row.IsActive} /> },
];

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function PaymentMethod() {
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
      const response = await getPaymentMethods();
      const records = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setData(records);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
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
          getCode(item).toLowerCase().includes(lowerSearch) ||
          getDescription(item).toLowerCase().includes(lowerSearch)
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
          <Wallet size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Payment Method Master</h1>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by code, name or description..."
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
            <Wallet size={18} />
            <span>Add Payment Method</span>
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

      <PaymentMethodForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchRecords}
        initialData={editingRecord}
      />
      <PaymentMethodDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchRecords}
        record={deletingRecord}
      />
    </div>
  );
}
