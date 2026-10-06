import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Link } from 'lucide-react';
import { MasterTable } from '../../../components/masters/MasterTable/MasterTable';
import { MasterStatusBadge } from '../../../components/masters/MasterStatusBadge/MasterStatusBadge';
import { getEmploymentTypes } from '../../../api/masters/employmentTypeApi';
import { getMappingsByEmploymentType } from '../../../api/masters/employmentTypeDocumentMappingApi';
import { getCustomerDocumentTypes } from '../../../api/masters/customerDocumentTypeApi';
import { formatDateTime } from '../../../utils/dateHelper';
import { EmploymentTypeDocumentMappingForm } from './EmploymentTypeDocumentMappingForm';
import './EmploymentTypeDocumentMapping.css';

const toList = (response) => (Array.isArray(response) ? response : (response?.data || response?.value || []));

const normalizeCategory = (row) => ({
  customerDocumentTypeId: row.customerDocumentTypeId ?? row.CustomerDocumentTypeId,
  documentTypeCode: row.documentTypeCode ?? row.DocumentTypeCode ?? '',
  documentTypeName: row.documentTypeName ?? row.DocumentTypeName ?? '',
  isActive: (row.isActive ?? row.IsActive) !== false,
});

const normalizeMapping = (row) => ({
  ...row,
  employmentTypeDocumentMappingId: row.employmentTypeDocumentMappingId ?? row.EmploymentTypeDocumentMappingId,
  employmentTypeId: row.employmentTypeId ?? row.EmploymentTypeId,
  customerDocumentTypeId: row.customerDocumentTypeId ?? row.CustomerDocumentTypeId ?? null,
  customerDocumentTypeName: row.customerDocumentTypeName ?? row.CustomerDocumentTypeName ?? '',
  documentTypeId: row.documentTypeId ?? row.DocumentTypeId ?? null,
  documentTypeName: row.documentTypeName ?? row.DocumentTypeName ?? '',
  isMandatory: (row.isMandatory ?? row.IsMandatory) === true,
  isActive: (row.isActive ?? row.IsActive) !== false,
  createdAt: row.createdAt ?? row.CreatedAt,
  modifiedAt: row.modifiedAt ?? row.ModifiedAt,
});

const COLUMNS = [
  { key: 'customerDocumentTypeName', label: 'Customer Document Category', render: (row) => row.customerDocumentTypeName || '—' },
  { 
    key: 'isMandatory', 
    label: 'Mandatory',
    render: (row) => (
      <span className={row.isMandatory ? 'badge-mandatory' : 'badge-optional'}>
        {row.isMandatory ? 'Required' : 'Optional'}
      </span>
    )
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
];

export function EmploymentTypeDocumentMapping() {
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [selectedEmploymentTypeId, setSelectedEmploymentTypeId] = useState('');
  const [customerDocumentTypes, setCustomerDocumentTypes] = useState([]);
  
  const [rawData, setRawData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEmpTypes = async () => {
      try {
        const response = await getEmploymentTypes();
        const records = Array.isArray(response) ? response : (response.data || response.value || []);
        if (isMounted) {
          setEmploymentTypes(records.filter(r => r.isActive !== false));
        }
      } catch (err) {
        console.error('Failed to load employment types', err);
      }
    };
    const fetchCategories = async () => {
      try {
        const response = await getCustomerDocumentTypes();
        if (isMounted) setCustomerDocumentTypes(toList(response).map(normalizeCategory));
      } catch (err) {
        console.error('Failed to load customer document categories', err);
      }
    };
    fetchEmpTypes();
    fetchCategories();
    return () => { isMounted = false; };
  }, []);

  const data = useMemo(() => rawData.map((mapping) => {
    if (mapping.customerDocumentTypeName || mapping.customerDocumentTypeId === null) return mapping;
    const category = customerDocumentTypes.find(
      (c) => String(c.customerDocumentTypeId) === String(mapping.customerDocumentTypeId)
    );
    return category ? { ...mapping, customerDocumentTypeName: category.documentTypeName } : mapping;
  }), [rawData, customerDocumentTypes]);

  const fetchMappings = async (empTypeId) => {
    if (!empTypeId) {
      setRawData([]);
      return;
    }
    
    setIsLoading(true);
    setIsError(false);
    try {
      const response = await getMappingsByEmploymentType(empTypeId);
      setRawData(toList(response).map(normalizeMapping));
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
      setIsError(true);
      setRawData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings(selectedEmploymentTypeId);
  }, [selectedEmploymentTypeId]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (row) => {
    if (!row || !row.employmentTypeDocumentMappingId) {
      console.error('Invalid record:', row);
      return;
    }
    setEditingRecord({
      ...row,
      employmentTypeName: employmentTypes.find(e => String(e.employmentTypeId) === String(selectedEmploymentTypeId))?.employmentTypeName || ''
    });
    setIsFormOpen(true);
  };

  const handleRefresh = () => {
    fetchMappings(selectedEmploymentTypeId);
  };

  return (
    <div className="masters-page">
      <header className="masters-page-header">
        <div className="masters-page-header-icon">
            <Link size={24} />
          </div>
          <div>
          <h1 className="masters-page-title">Employment Type Document Mapping</h1>
          <p className="masters-page-description">
            Configure documents and verification requirements for each employment type.
          </p>
        </div>
      </header>

      <div className="masters-page-toolbar">
        <div className="masters-page-search-area">
          <select
            className="form-input"
            value={selectedEmploymentTypeId}
            onChange={(e) => setSelectedEmploymentTypeId(e.target.value)}
            style={{ width: '100%', maxWidth: '300px' }}
          >
            <option value="">Select Employment Type ▼</option>
            {employmentTypes.map((emp) => (
              <option key={emp.employmentTypeId} value={emp.employmentTypeId}>
                {emp.employmentTypeName}
              </option>
            ))}
          </select>
        </div>
        <div className="masters-page-actions-area">
          <button 
            type="button" 
            className="masters-btn-secondary" 
            onClick={handleRefresh}
            title="Refresh records"
            disabled={isLoading || !selectedEmploymentTypeId}
          >
            <RefreshCw size={18} className={isLoading ? 'master-spin' : ''} />
          </button>
          <button 
            type="button" 
            className="masters-btn-primary" 
            onClick={handleAdd}
            disabled={!selectedEmploymentTypeId}
          >
            <Link size={18} />
            <span>Assign Document</span>
          </button>
        </div>
      </div>

      <div className="masters-page-content">
        {!selectedEmploymentTypeId ? (
          <div className="empty-state">
            <p>Please select an employment type to configure mappings.</p>
          </div>
        ) : isLoading ? (
          <div className="empty-state">
            <p>Loading mappings...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <h3 style={{ marginBottom: '8px' }}>No active document mappings found</h3>
            <p>Configure document requirements for this employment type.</p>
          </div>
        ) : (
          <MasterTable 
            columns={COLUMNS}
            data={data}
            isLoading={isLoading}
            isError={isError}
            onEdit={handleEdit}
          />
        )}
      </div>

      <EmploymentTypeDocumentMappingForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleRefresh}
        initialData={editingRecord}
        existingMappings={data}
        selectedEmploymentTypeId={selectedEmploymentTypeId}
        employmentTypes={employmentTypes}
        customerDocumentTypes={customerDocumentTypes}
      />
    </div>
  );
}
