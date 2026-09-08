import { useEffect, useMemo, useState } from 'react';
import { Percent, RefreshCw } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getFOIRs } from '../../../api/masters/foirApi';
import { getEmploymentTypes } from '../../../api/masters/employmentTypeApi';
import { FOIRForm } from './FOIRForm';
import { FOIRDeleteConfirm } from './FOIRDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './FOIR.css';

const getId = (row) => row?.foirId ?? row?.FoirId ?? row?.id;
const getEmploymentTypeId = (row) => row?.employmentTypeId ?? row?.EmploymentTypeId;
const getEmploymentTypeName = (row) => row?.employmentTypeName ?? row?.EmploymentTypeName ?? '';
const getPercent = (row) => row?.foirPercent ?? row?.FoirPercent;
const getActive = (row) => row?.isActive ?? row?.IsActive;

const unwrap = (response) => Array.isArray(response)
  ? response
  : response?.data || response?.value || [];

const isActiveValue = (value) => value === true || value === 1 || value === '1';

const formatDate = (value) => value ? formatDateTime(value) : 'N/A';

export function FOIR() {
  const [data, setData] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
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
      const [foirResponse, employmentResponse] = await Promise.all([
        getFOIRs(),
        getEmploymentTypes(),
      ]);
      setData(unwrap(foirResponse));
      setEmploymentTypes(unwrap(employmentResponse));
    } catch (error) {
      console.error('Failed to fetch FOIR records:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const employmentTypeMap = useMemo(() => (
    employmentTypes.reduce((map, item) => {
      const id = item.employmentTypeId ?? item.EmploymentTypeId ?? item.id;
      if (id != null) map[id] = item.employmentTypeName ?? item.EmploymentTypeName ?? item.name ?? `Type ${id}`;
      return map;
    }, {})
  ), [employmentTypes]);

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((row) => {
      const employmentName = getEmploymentTypeName(row) || employmentTypeMap[getEmploymentTypeId(row)] || '';
      const matchesSearch = !query || [employmentName, getPercent(row), getId(row)]
        .some((value) => String(value ?? '').toLowerCase().includes(query));
      const matchesStatus = filterStatus === 'All' || isActiveValue(getActive(row)) === (filterStatus === 'Active');
      return matchesSearch && matchesStatus;
    });
  }, [data, employmentTypeMap, filterStatus, searchTerm]);

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
      key: 'employmentTypeId',
      label: 'Employment Type',
      render: (row) => getEmploymentTypeName(row) || employmentTypeMap[getEmploymentTypeId(row)] || `Type ${getEmploymentTypeId(row) || 'N/A'}`,
    },
    {
      key: 'foirPercent',
      label: 'FOIR (%)',
      render: (row) => getPercent(row) != null ? `${Number(getPercent(row)).toFixed(2)}%` : 'N/A',
    },
    { key: 'effectiveFrom', label: 'Effective From', render: (row) => formatDate(row.effectiveFrom ?? row.EffectiveFrom) },
    { key: 'effectiveTo', label: 'Effective To', render: (row) => formatDate(row.effectiveTo ?? row.EffectiveTo) },
    { key: 'isActive', label: 'Status', render: (row) => <MasterStatusBadge status={getActive(row)} /> },
  ];

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon"><Percent size={24} /></div>
        <div>
          <h1 className="masters-page-title">FOIR Master</h1>
          <p className="masters-page-description">Manage fixed obligation to income ratio configuration.</p>
        </div>
      </header>

      <div className="masters-page-content">
        <div className="masters-page-toolbar">
          <MasterSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search employment type or FOIR..." />
          <div className="masters-page-toolbar-actions">
            <MasterFilter value={filterStatus} onChange={setFilterStatus} />
            <button type="button" className="masters-btn-secondary" onClick={fetchData} disabled={isLoading} title="Refresh records">
              <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
            </button>
            <button type="button" className="masters-btn-primary" onClick={() => { setEditingRecord(null); setIsFormOpen(true); }}>
              <Percent size={18} /> <span>Add FOIR</span>
            </button>
          </div>
        </div>

        <MasterTable
          columns={columns}
          data={paginatedData}
          isLoading={isLoading}
          isError={isError}
          onEdit={(row) => { setEditingRecord(row); setIsFormOpen(true); }}
          onDelete={(row) => { setDeletingRecord(row); setIsDeleteOpen(true); }}
        />

        {!isLoading && !isError && filteredData.length > 0 && (
          <MasterPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </div>

      <FOIRForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
        editingRecord={editingRecord}
        employmentTypes={employmentTypes}
      />
      <FOIRDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchData}
        record={deletingRecord}
      />
    </div>
  );
}
