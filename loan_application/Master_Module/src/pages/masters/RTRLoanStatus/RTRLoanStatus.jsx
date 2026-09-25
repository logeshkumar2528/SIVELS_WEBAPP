import { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, RefreshCw, Calendar } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getRtrLoanStatuses } from '../../../api/masters/rtrLoanStatusApi';
import { RTRLoanStatusForm } from './RTRLoanStatusForm';
import { RTRLoanStatusDeleteConfirm } from './RTRLoanStatusDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './RTRLoanStatus.css';

const getId = (row) =>
  row?.rtrLoanStatusId ??
  row?.RtrLoanStatusId ??
  row?.id ??
  row?.Id;

const getStatusCode = (row) =>
  row?.statusCode ??
  row?.StatusCode ??
  '';

const getStatusName = (row) =>
  row?.statusName ??
  row?.StatusName ??
  '';

const getActive = (row) => {
  const v = row?.isActive ?? row?.IsActive ?? row?.active ?? row?.Active;
  return v === true || v === 1 || v === '1';
};

const unwrap = (response) =>
  Array.isArray(response)
    ? response
    : response?.data || response?.value || [];

const isActiveValue = (value) =>
  value === true || value === 1 || value === '1';

export function RTRLoanStatus() {
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

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getRtrLoanStatuses();
      setData(unwrap(response));
    } catch (error) {
      console.error('Failed to fetch RTR Loan Statuses:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Client-side filtering
  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((row) => {
      const code = getStatusCode(row).toLowerCase();
      const name = getStatusName(row).toLowerCase();
      const matchesSearch =
        !query ||
        code.includes(query) ||
        name.includes(query) ||
        String(getId(row) ?? '').toLowerCase().includes(query);

      const matchesStatus =
        filterStatus === 'All' ||
        isActiveValue(getActive(row)) === (filterStatus === 'Active');

      return matchesSearch && matchesStatus;
    });
  }, [data, filterStatus, searchTerm]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const columns = [
    {
      key: 'statusCode',
      label: 'Status Code',
      render: (row) => (
        <span className="rtr-status-code-badge">
          {getStatusCode(row) || '—'}
        </span>
      ),
    },
    {
      key: 'statusName',
      label: 'Status Name',
      render: (row) => (
        <span className="rtr-status-name-cell">
          {getStatusName(row) || '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <MasterStatusBadge status={getActive(row)} />,
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (row) => {
        const date = row?.createdAt || row?.CreatedAt || row?.createdDate || row?.CreatedDate;
        return (
          <div className="table-date-cell">
            {date ? <Calendar size={14} className="table-date-icon" /> : null}
            <span>{formatDateTime(date) || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'modifiedAt',
      label: 'Modified Date',
      render: (row) => {
        const date = row?.modifiedAt || row?.ModifiedAt || row?.modifiedDate || row?.ModifiedDate;
        return (
          <div className="table-date-cell">
            {date ? <Calendar size={14} className="table-date-icon" /> : null}
            <span>{formatDateTime(date) || '—'}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <FileSpreadsheet size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">RTR Loan Status Master</h1>
          <p className="masters-page-description">
            Manage RTR loan statuses used across RTR obligation sheets.
          </p>
        </div>
      </header>

      <div className="masters-page-content">
        <div className="masters-page-toolbar">
          <div className="masters-page-search-area">
            <MasterSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by status code or name..."
            />
          </div>
          <div className="masters-page-toolbar-actions">
            <MasterFilter value={filterStatus} onChange={setFilterStatus} />
            <button
              type="button"
              className="masters-btn-secondary"
              onClick={fetchData}
              disabled={isLoading}
              title="Refresh records"
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
              <FileSpreadsheet size={18} /> <span>Add RTR Loan Status</span>
            </button>
          </div>
        </div>

        <MasterTable
          columns={columns}
          data={paginatedData}
          isLoading={isLoading}
          isError={isError}
          onEdit={(row) => {
            setEditingRecord(row);
            setIsFormOpen(true);
          }}
          onDelete={(row) => {
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
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <RTRLoanStatusForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={fetchData}
        editingRecord={editingRecord}
      />

      <RTRLoanStatusDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingRecord(null);
        }}
        onSuccess={fetchData}
        record={deletingRecord}
      />
    </div>
  );
}

export default RTRLoanStatus;
