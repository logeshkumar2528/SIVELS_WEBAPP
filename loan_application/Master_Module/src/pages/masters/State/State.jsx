import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Edit, Trash2, Map } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getStates } from '../../../api/masters/stateApi';
import { StateForm } from './StateForm';
import { StateDeleteConfirm } from './StateDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './State.css';


const COLUMNS = [
  { key: 'stateCode', label: 'State Code' },
  { key: 'stateName', label: 'State Name' },
  { key: 'gstStateCode', label: 'GST State Code' },
  { 
    key: 'createdDate', 
    label: 'Created Date',
    render: (row) => formatDateTime(row.createdDate)
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

export function State() {
  const [states, setStates] = useState([]);
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

  const fetchStates = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getStates();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setStates(data);
    } catch (err) {
      console.error('Failed to fetch states:', err);
      if (!err.response) {
        toast.error('Unable to connect to the server.');
      } else if (err.response.status === 500) {
        toast.error('Something went wrong. Please try again.');
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStates();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === "1";

  // Client-side filtering
  const filteredData = useMemo(() => {
    return states.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        item.stateCode?.toLowerCase().includes(searchLower) ||
        item.stateName?.toLowerCase().includes(searchLower) ||
        item.gstStateCode?.toLowerCase().includes(searchLower);

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === "all"
          ? true
          : statusFilterLower === "active"
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [states, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize).map(item => ({
      ...item,
      id: item.stateId // Ensure MasterTable has an id prop
    }));
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.stateId) {
      console.error('Invalid record or missing stateId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.stateId) {
      console.error('Invalid record or missing stateId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Map size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">State</h1>
          <p className="masters-page-description">
            Manage state configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by State Code, Name, or GST..."
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
            onClick={fetchStates}
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
            <Map size={18} />
            <span>Add State</span>
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

      <StateForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchStates}
        initialData={editingRecord}
      />

      <StateDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchStates}
        record={deletingRecord}
      />
    </div>
  );
}
