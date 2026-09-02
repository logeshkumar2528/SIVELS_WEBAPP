import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Edit, Trash2, Home } from 'lucide-react';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getProperties } from '../../../api/masters/propertyApi';
import { PropertyForm } from './PropertyForm';
import { PropertyDeleteConfirm } from './PropertyDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './Property.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function Property() {
  const [properties, setProperties] = useState([]);
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

  const fetchProperties = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getProperties();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setProperties(data);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === '1';

  // Client-side filtering
  const filteredProperties = useMemo(() => {
    return properties.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.propertyCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.propertyName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === 'all'
          ? true
          : statusFilterLower === 'active'
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredProperties.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProperties.slice(startIndex, startIndex + pageSize);
  }, [filteredProperties, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.propertyId) {
      console.error('Invalid record or missing propertyId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.propertyId) {
      console.error('Invalid record or missing propertyId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Home size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Property</h1>
          <p className="masters-page-description">
            Manage property type configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Property Code or Property Name..."
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
            onClick={fetchProperties}
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
            <Home size={18} />
            <span>Add Property</span>
          </button>
        </div>
      </div>

      <div className="masters-page-content">
        {isLoading ? (
          <div className="master-table-state">
            <div className="master-table-spinner" aria-label="Loading records..." />
          </div>
        ) : isError ? (
          <div className="master-table-state">
            <p className="master-table-error">Failed to load property data.</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No property records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Property Code</th>
                  <th className="master-table-th">Property Name</th>
                  <th className="master-table-th">Created Date</th>
                  <th className="master-table-th">Modified Date</th>
                  <th className="master-table-th">Status</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((property) => (
                  <tr key={property.propertyId} className="master-table-row">
                    <td className="master-table-td">{property.propertyCode}</td>
                    <td className="master-table-td">{property.propertyName}</td>
                    <td className="master-table-td">{formatDateTime(property.createdAt)}</td>
                    <td className="master-table-td">{formatDateTime(property.modifiedAt)}</td>
                    <td className="master-table-td">
                      <MasterStatusBadge status={property.isActive} />
                    </td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(property)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(property)}
                          aria-label="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && filteredProperties.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredProperties.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <PropertyForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchProperties}
        initialData={editingRecord}
      />

      <PropertyDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchProperties}
        record={deletingRecord}
      />
    </div>
  );
}
