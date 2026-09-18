import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getRTRNormMasters } from '../../../api/masters/rtrNormMasterApi';
import { RTRNormMasterForm } from './RTRNormMasterForm';
import './RTRNormMaster.css';

const getId = (row) =>
  row?.rtrNormMasterId ??
  row?.RTRNormMasterId ??
  row?.RtrNormMasterId ??
  row?.id ??
  row?.Id;

const getMinMOB = (row) => row?.minMOB ?? row?.MinMOB ?? row?.minMob ?? row?.MinMob;
const getMaxMOB = (row) => row?.maxMOB ?? row?.MaxMOB ?? row?.maxMob ?? row?.MaxMob;
const getMaxODCount = (row) => row?.maxODCount ?? row?.MaxODCount ?? row?.maxOdCount ?? row?.MaxOdCount;
const getMaxBounceCount = (row) => row?.maxBounceCount ?? row?.MaxBounceCount;
const getEMIMultiplier = (row) => row?.emiMultiplier ?? row?.EMIMultiplier ?? row?.EmiMultiplier;
const getMaxTopUpPercentage = (row) => row?.maxTopUpPercentage ?? row?.MaxTopUpPercentage;
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

export function RTRNormMaster() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getRTRNormMasters();
      setData(unwrap(response));
    } catch (error) {
      console.error('Failed to fetch RTR Norm Master records:', error);
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
      const matchesSearch =
        !query ||
        [
          getMinMOB(row),
          getMaxMOB(row),
          getMaxODCount(row),
          getMaxBounceCount(row),
          getEMIMultiplier(row),
          getMaxTopUpPercentage(row),
          getId(row),
        ].some((val) => String(val ?? '').toLowerCase().includes(query));

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
      key: 'minMOB',
      label: 'Min MOB',
      render: (row) =>
        getMinMOB(row) != null ? String(getMinMOB(row)) : '—',
    },
    {
      key: 'maxMOB',
      label: 'Max MOB',
      render: (row) =>
        getMaxMOB(row) != null ? String(getMaxMOB(row)) : '—',
    },
    {
      key: 'maxODCount',
      label: 'Max OD Count',
      render: (row) =>
        getMaxODCount(row) != null ? String(getMaxODCount(row)) : '0',
    },
    {
      key: 'maxBounceCount',
      label: 'Max Bounce Count',
      render: (row) =>
        getMaxBounceCount(row) != null ? String(getMaxBounceCount(row)) : '0',
    },
    {
      key: 'emiMultiplier',
      label: 'EMI Multiplier',
      render: (row) =>
        getEMIMultiplier(row) != null
          ? `${Number(getEMIMultiplier(row)).toFixed(2)}x`
          : '—',
    },
    {
      key: 'maxTopUpPercentage',
      label: 'Max Top-Up %',
      render: (row) =>
        getMaxTopUpPercentage(row) != null
          ? `${Number(getMaxTopUpPercentage(row))}%`
          : '—',
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => <MasterStatusBadge status={getActive(row)} />,
    },
  ];

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
          <FileSpreadsheet size={24} />
        </div>
        <div>
          <h1 className="masters-page-title">RTR Norm Master</h1>
          <p className="masters-page-description">
            Manage Repayment Track Record underwriting norms, multipliers, and eligibility benchmarks.
          </p>
        </div>
      </header>

      <div className="masters-page-content">
        <div className="masters-page-toolbar">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search MOB, multiplier, bounce count..."
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
              <FileSpreadsheet size={18} /> <span>Add RTR Norm</span>
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

      <RTRNormMasterForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={fetchData}
        editingRecord={editingRecord}
      />
    </div>
  );
}

export default RTRNormMaster;
