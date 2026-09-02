import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Edit, Trash2, Contact } from 'lucide-react';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getCastes } from '../../../api/masters/casteApi';
import { CasteForm } from './CasteForm';
import { CasteDeleteConfirm } from './CasteDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './Caste.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function Caste() {
  const [castes, setCastes] = useState([]);
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

  const fetchCastes = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getCastes();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setCastes(data);
    } catch (error) {
      console.error('Failed to fetch castes:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCastes();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === '1';

  // Client-side filtering
  const filteredCastes = useMemo(() => {
    return castes.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.casteCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.casteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.religionName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === 'all'
          ? true
          : statusFilterLower === 'active'
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [castes, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredCastes.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCastes.slice(startIndex, startIndex + pageSize);
  }, [filteredCastes, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.casteId) {
      console.error('Invalid record or missing casteId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.casteId) {
      console.error('Invalid record or missing casteId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Contact size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Caste</h1>
          <p className="masters-page-description">
            Manage caste configuration and relationships.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Code, Name, or Religion..."
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
            onClick={fetchCastes}
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
            <Contact size={18} />
            <span>Add Caste</span>
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
            <p className="master-table-error">Failed to load caste data.</p>
          </div>
        ) : filteredCastes.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No caste records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Religion</th>
                  <th className="master-table-th">Caste Category</th>
                  <th className="master-table-th">Caste Name</th>
                  <th className="master-table-th">Reservation</th>
                  <th className="master-table-th">Code</th>
                  <th className="master-table-th">Status</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((caste) => (
                  <tr key={caste.casteId} className="master-table-row">
                    <td className="master-table-td">{caste.religionName}</td>
                    <td className="master-table-td">{caste.casteCategory}</td>
                    <td className="master-table-td">{caste.casteName}</td>
                    <td className="master-table-td">{caste.reservationCategory}</td>
                    <td className="master-table-td">{caste.casteCode}</td>
                    <td className="master-table-td">
                      <MasterStatusBadge status={caste.isActive} />
                    </td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(caste)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(caste)}
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

        {!isLoading && !isError && filteredCastes.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredCastes.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <CasteForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchCastes}
        initialData={editingRecord}
      />

      <CasteDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchCastes}
        record={deletingRecord}
      />
    </div>
  );
}
