import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Edit, Trash2, GraduationCap } from 'lucide-react';
import { MasterSearch } from '../../../components/masters/MasterSearch/MasterSearch';
import { MasterFilter } from '../../../components/masters/MasterFilter/MasterFilter';
import { MasterPagination } from '../../../components/masters/MasterPagination/MasterPagination';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getEducations } from '../../../api/masters/educationApi';
import { EducationForm } from './EducationForm';
import { EducationDeleteConfirm } from './EducationDeleteConfirm';
import { formatDateTime } from '../../../utils/dateHelper';
import './Education.css';


const FILTER_OPTIONS = [
  { value: 'All', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export function Education() {
  const [educations, setEducations] = useState([]);
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

  const fetchEducations = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getEducations();
      const data = Array.isArray(response)
        ? response
        : response?.value ?? response?.data ?? response?.result ?? [];
      setEducations(data);
    } catch (error) {
      console.error('Failed to fetch educations:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEducations();
  }, []);

  const isActiveValue = (value) =>
    value === true ||
    value === 1 ||
    value === '1';

  // Client-side filtering
  const filteredEducations = useMemo(() => {
    return educations.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.educationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.educationName?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusFilterLower = filterStatus.toLowerCase();

      const matchesStatus =
        statusFilterLower === 'all'
          ? true
          : statusFilterLower === 'active'
          ? isActiveValue(item.isActive)
          : !isActiveValue(item.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [educations, searchTerm, filterStatus]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredEducations.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEducations.slice(startIndex, startIndex + pageSize);
  }, [filteredEducations, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.educationId) {
      console.error('Invalid record or missing educationId:', row);
      return;
    }
    setEditingRecord(row);
    setIsFormOpen(true);
  };

  const handleDelete = (row) => {
    if (!row || !row.educationId) {
      console.error('Invalid record or missing educationId:', row);
      return;
    }
    setDeletingRecord(row);
    setIsDeleteOpen(true);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <GraduationCap size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Education</h1>
          <p className="masters-page-description">
            Manage education and qualification configuration.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <MasterSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by Education Code or Name..."
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
            onClick={fetchEducations}
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
            <GraduationCap size={18} />
            <span>Add Education</span>
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
            <p className="master-table-error">Failed to load education data.</p>
          </div>
        ) : filteredEducations.length === 0 ? (
          <div className="master-table-state">
            <p className="master-table-empty">No education records found.</p>
          </div>
        ) : (
          <div className="master-table-container">
            <table className="master-table">
              <thead>
                <tr>
                  <th className="master-table-th">Education Code</th>
                  <th className="master-table-th">Education Name</th>
                  <th className="master-table-th">Qualification Level</th>
                  <th className="master-table-th">Created Date</th>
                  <th className="master-table-th">Modified Date</th>
                  <th className="master-table-th">Status</th>
                  <th className="master-table-th master-table-actions-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((education) => (
                  <tr key={education.educationId} className="master-table-row">
                    <td className="master-table-td">{education.educationCode}</td>
                    <td className="master-table-td">{education.educationName}</td>
                    <td className="master-table-td">{education.qualificationLevel}</td>
                    <td className="master-table-td">{formatDateTime(education.createdAt)}</td>
                    <td className="master-table-td">{formatDateTime(education.modifiedAt)}</td>
                    <td className="master-table-td">
                      <MasterStatusBadge status={education.isActive} />
                    </td>
                    <td className="master-table-td master-table-actions-td">
                      <div className="master-table-actions">
                        <button
                          type="button"
                          className="master-action-btn edit-btn"
                          onClick={() => handleEdit(education)}
                          aria-label="Edit record"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="master-action-btn delete-btn"
                          onClick={() => handleDelete(education)}
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

        {!isLoading && !isError && filteredEducations.length > 0 && (
          <MasterPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredEducations.length}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
          />
        )}
      </div>

      <EducationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchEducations}
        initialData={editingRecord}
      />

      <EducationDeleteConfirm
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchEducations}
        record={deletingRecord}
      />
    </div>
  );
}
