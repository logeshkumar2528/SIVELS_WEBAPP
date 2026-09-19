import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Calendar } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getHealthCheckTypes } from '../../../api/masters/healthCheckTypeApi';
import { HealthCheckTypeForm } from './HealthCheckTypeForm';
import { HealthCheckTypeDeleteConfirm } from './HealthCheckTypeDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './HealthCheckType.css';

const getId = (row) =>
  row?.healthCheckTypeId ??
  row?.HealthCheckTypeId ??
  row?.id ??
  row?.Id;

const getCheckName = (row) =>
  row?.checkName ??
  row?.CheckName ??
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

export function HealthCheckType() {
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

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getHealthCheckTypes();
      setData(unwrap(response));
    } catch (error) {
      console.error('Failed to fetch Health Check Types:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((row) => {
      const name = getCheckName(row).toLowerCase();
      const matchesSearch = !query || name.includes(query) || String(getId(row) ?? '').toLowerCase().includes(query);

      const matchesStatus =
        filterStatus === 'All' ||
        isActiveValue(getActive(row)) === (filterStatus === 'Active');

      return matchesSearch && matchesStatus;
    });
  }, [data, filterStatus, searchTerm]);

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
      key: 'checkName',
      label: 'Health Check Type',
      render: (row) => (
        <span className="health-check-type-name-cell">
          {getCheckName(row) || '—'}
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
      label: 'Created At',
      render: (row) => {
        const date = row?.createdAt || row?.CreatedAt || row?.createdDate;
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
      label: 'Modified At',
      render: (row) => {
        const date = row?.modifiedAt || row?.ModifiedAt || row?.modifiedDate;
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
          <Activity size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">Health Check Type Master</h1>
          <p className="masters-page-description">
            Manage health check types used across verification workflows.
          </p>
        </div>
      </header>

      <div className="masters-page-content">
        <div className="masters-page-toolbar">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search health check types..."
          />
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
              <Activity size={18} /> <span>Add Health Check Type</span>
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
            if (!getActive(row)) return;
            setDeletingRecord(row);
            setIsDeleteOpen(true);
          }}
          canDelete={(row) => getActive(row)}
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

      <HealthCheckTypeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={fetchData}
        editingRecord={editingRecord}
      />

      <HealthCheckTypeDeleteConfirm
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

export default HealthCheckType;
