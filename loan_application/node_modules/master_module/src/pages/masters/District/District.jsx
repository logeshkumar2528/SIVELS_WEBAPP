import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, RefreshCw } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getDistricts } from '../../../api/masters/districtApi';
import { getStates } from '../../../api/masters/stateApi';
import { DistrictForm } from './DistrictForm';
import { DistrictDeleteConfirm } from './DistrictDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './District.css';

const PAGE_SIZE = 10;

const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export function District() {
  const [districts, setDistricts] = useState([]);
  const [states, setStates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

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
      const [districtsResponse, statesResponse] = await Promise.all([
        getDistricts(),
        getStates()
      ]);
      
      const distData = Array.isArray(districtsResponse)
        ? districtsResponse
        : districtsResponse?.value ?? districtsResponse?.data ?? districtsResponse?.result ?? [];
        
      const stateData = Array.isArray(statesResponse)
        ? statesResponse
        : statesResponse?.value ?? statesResponse?.data ?? statesResponse?.result ?? [];

      setDistricts(distData);
      setStates(stateData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      if (!err?.response) {
        toast.error('Unable to connect to the server.');
      } else if (err.response.status === 500) {
        toast.error('Something went wrong. Please try again.');
      } else {
        toast.error('Unable to load records.');
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStateName = useCallback((stateId) => {
    const state = states.find(s => s.stateId === stateId);
    return state ? state.stateName : stateId;
  }, [states]);

  const COLUMNS = useMemo(() => [
    { key: 'districtCode', label: 'District Code' },
    { key: 'districtName', label: 'District Name' },
    { 
      key: 'stateId', 
      label: 'State',
      render: (row) => getStateName(row.stateId)
    },
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
  ], [getStateName]);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === "1";

  // Client-side filtering
  const filteredData = useMemo(() => {
    return districts.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const stateName = getStateName(item.stateId)?.toString().toLowerCase() || '';
      const matchesSearch =
        !searchTerm ||
        item.districtCode?.toLowerCase().includes(searchLower) ||
        item.districtName?.toLowerCase().includes(searchLower) ||
        stateName.includes(searchLower);

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === "all"
          ? true
          : statusFilterLower === "active"
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [districts, searchTerm, filterStatus, getStateName]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(startIndex, startIndex + PAGE_SIZE).map(item => ({
      ...item,
      id: item.districtId // Ensure MasterTable has an id prop
    }));
  }, [filteredData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.districtId) {
      console.error('Invalid record or missing districtId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.districtId) {
      console.error('Invalid record or missing districtId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div>
          <h1 className="masters-page-title">District Master</h1>
          <p className="masters-page-description">
            Manage district configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Code, Name, or State..."
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
            onClick={fetchData}
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
            <Plus size={18} />
            <span>Add District</span>
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
          />
        )}
      </div>

      <DistrictForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
        initialData={editingRecord}
      />

      <DistrictDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchData}
        record={deletingRecord}
      />
    </div>
  );
}
