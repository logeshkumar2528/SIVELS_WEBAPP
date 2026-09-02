import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Building2 } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getCities } from '../../../api/masters/cityApi';
import { getDistricts } from '../../../api/masters/districtApi';
import { CityForm } from './CityForm';
import { CityDeleteConfirm } from './CityDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './City.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export function City() {
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
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
      const [citiesResponse, districtsResponse] = await Promise.all([
        getCities(),
        getDistricts()
      ]);
      
      const cityData = Array.isArray(citiesResponse)
        ? citiesResponse
        : citiesResponse?.value ?? citiesResponse?.data ?? citiesResponse?.result ?? [];
        
      const distData = Array.isArray(districtsResponse)
        ? districtsResponse
        : districtsResponse?.value ?? districtsResponse?.data ?? districtsResponse?.result ?? [];

      setCities(cityData);
      setDistricts(distData);
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

  const getDistrictName = useCallback((districtId) => {
    const district = districts.find(d => d.districtId === districtId);
    return district ? district.districtName : districtId;
  }, [districts]);

  const COLUMNS = useMemo(() => [
    { key: 'cityCode', label: 'City Code' },
    { key: 'cityName', label: 'City Name' },
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
  ], [getDistrictName]);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === "1";

  // Client-side filtering
  const filteredData = useMemo(() => {
    return cities.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      const districtName = getDistrictName(item.districtId)?.toString().toLowerCase() || '';
      
      const matchesSearch =
        !searchTerm ||
        item.cityCode?.toLowerCase().includes(searchLower) ||
        item.cityName?.toLowerCase().includes(searchLower) ||
        item.pincode?.toLowerCase().includes(searchLower) ||
        districtName.includes(searchLower);

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === "all"
          ? true
          : statusFilterLower === "active"
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [cities, searchTerm, filterStatus, getDistrictName]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize).map(item => ({
      ...item,
      id: item.cityId // Ensure MasterTable has an id prop
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
    if (!row || !row.cityId) {
      console.error('Invalid record or missing cityId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.cityId) {
      console.error('Invalid record or missing cityId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Building2 size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">City Master</h1>
          <p className="masters-page-description">
            Manage city configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Search by Code, Name, Pincode or District..."
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
            <Building2 size={18} />
            <span>Add City</span>
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

      <CityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchData}
        initialData={editingRecord}
      />

      <CityDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchData}
        record={deletingRecord}
      />
    </div>
  );
}
