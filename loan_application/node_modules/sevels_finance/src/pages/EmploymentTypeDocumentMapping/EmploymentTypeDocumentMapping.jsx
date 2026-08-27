import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Edit, Trash2, Search, FileText, CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { TableSkeleton, TableEmpty, TableError } from '../../components/common/TableStates/TableStates';
import ConfirmModal from '../../components/common/ConfirmModal/ConfirmModal';
import MappingModal from './components/MappingModal';
import { masterService } from '../../services/masterService';
import '../../styles/StandardUI.css';

const EmploymentTypeDocumentMapping = () => {
  const [mappings, setMappings] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [empTypeFilter, setEmpTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [modalState, setModalState] = useState({ isOpen: false, mapping: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast({ show: false, message: '', isError: false });
    }, 3000);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [empTypes, docTypes] = await Promise.all([
        masterService.getEmploymentTypes(),
        masterService.getDocumentTypes(),
      ]);
      setEmploymentTypes(Array.isArray(empTypes) ? empTypes : (empTypes?.data || []));
      setDocumentTypes(Array.isArray(docTypes) ? docTypes : (docTypes?.data || []));
      
      await fetchMappings();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMappings = async (employmentTypeId = '') => {
    try {
      setLoading(true);
      setError(null);
      let data;
      if (employmentTypeId) {
        data = await masterService.getEmploymentTypeDocumentMapping(employmentTypeId);
      } else {
        data = await masterService.getAllEmploymentTypeDocumentMappings();
      }
      setMappings(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load mappings');
    } finally {
      setLoading(false);
    }
  };

  const handleEmpTypeFilterChange = (e) => {
    const val = e.target.value;
    setEmpTypeFilter(val);
    fetchMappings(val);
  };

  const handleSaveMapping = async (formData) => {
    try {
      if (formData.employmentTypeDocumentMappingId) {
        // Edit flow: User is editing an existing mapping and document type
        
        // STEP 1: Update DocumentTypeMaster
        try {
          await masterService.updateDocumentType(formData.documentTypeId, {
            documentTypeId: formData.documentTypeId,
            documentTypeName: formData.documentTypeName,
            documentTypeCode: formData.documentTypeCode,
            isActive: formData.isActive,
            modifiedBy: 1 // TEMPORARY_CREATED_BY
          });
        } catch (docErr) {
          throw new Error('Failed to update Document Type: ' + (docErr.response?.data?.message || docErr.message));
        }

        // STEP 2: Update Mapping
        try {
          await masterService.updateEmploymentTypeDocumentMapping(
            formData.employmentTypeDocumentMappingId,
            {
              employmentTypeDocumentMappingId: formData.employmentTypeDocumentMappingId,
              employmentTypeId: formData.employmentTypeId,
              documentTypeId: formData.documentTypeId,
              isMandatory: true,
              isActive: formData.isActive,
              modifiedBy: 1 // TEMPORARY_CREATED_BY
            }
          );
        } catch (mapErr) {
          throw new Error('Document type updated, but mapping update failed: ' + (mapErr.response?.data?.message || mapErr.message));
        }

        showToast('Document Type and Mapping updated successfully');
      } else {
        // Add flow
        // STEP 1: Call: POST /api/DocumentTypeMaster
        let newDocId;
        try {
          const docRes = await masterService.createDocumentType({
            documentTypeName: formData.documentTypeName,
            documentTypeCode: formData.documentTypeCode,
            isActive: formData.isActive,
            createdBy: 1 // TEMPORARY_CREATED_BY
          });
          newDocId = docRes.documentTypeId || docRes.id;
          
          if (!newDocId) {
            throw new Error("Document type was created, but no ID was returned in the response.");
          }
        } catch (docErr) {
          throw new Error(docErr.response?.data?.message || docErr.message || 'Failed to create Document Type');
        }

        // STEP 3: Call: POST /api/EmploymentTypeDocumentMapping
        try {
          await masterService.createEmploymentTypeDocumentMapping({
            employmentTypeId: formData.employmentTypeId,
            documentTypeId: newDocId,
            isMandatory: true,
            isActive: formData.isActive,
            createdBy: 1 // TEMPORARY_CREATED_BY
          });
        } catch (mapErr) {
          throw new Error('Document type was created, but employment type mapping could not be saved: ' + (mapErr.response?.data?.message || mapErr.message));
        }
        
        // STEP 4: Only show success AFTER both APIs succeed
        showToast('Document Type and Mapping created successfully');
      }
      setModalState({ isOpen: false, mapping: null });
      // Refresh both lists
      fetchInitialData();
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('Duplicate mapping: This document is already mapped to the selected employment type.', true);
      } else {
        showToast(err.message || 'Failed to save', true);
      }
    }
  };

  const confirmDelete = async () => {
    try {
      await masterService.deleteEmploymentTypeDocumentMapping(deleteModal.id);
      showToast('Mapping deleted successfully');
      fetchMappings(empTypeFilter);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete mapping', true);
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const getEmpTypeName = (id) => {
    const emp = employmentTypes.find(e => (e.id || e.employmentTypeId) == id);
    return emp ? (emp.name || emp.employmentTypeName || emp.type || emp.description) : id;
  };

  const getDocTypeName = (id) => {
    const doc = documentTypes.find(d => (d.id || d.documentTypeId) == id);
    return doc ? (doc.name || doc.documentTypeName || doc.type || doc.description) : id;
  };

  const getDocTypeCode = (id) => {
    const doc = documentTypes.find(d => (d.id || d.documentTypeId) == id);
    return doc ? (doc.code || doc.documentTypeCode) : '-';
  };

  const filteredMappings = mappings.filter((m) => {
    const matchesSearch = 
      getEmpTypeName(m.employmentTypeId)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDocTypeName(m.documentTypeId)?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = m.isActive === true;
    if (statusFilter === 'inactive') matchesStatus = m.isActive === false;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout title="Employment Type Document Mapping" hideSidebar={true}>
      <div className="std-page">
        <div className="std-container std-list-view">
          
          <div className="std-header">
            <div className="std-header-left">
              <FileText size={20} />
              <div>
                <h2>Document Type Master</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Configure document types and their employment type mappings.</p>
              </div>
            </div>
            
            <button className="std-btn std-btn-header-action" onClick={() => setModalState({ isOpen: true, mapping: null })}>
              <Plus size={16} />
              Add Document Type
            </button>
          </div>
          
          <div className="std-table-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '0.4rem 2rem 0.4rem 2rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  width: '100%'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            </div>

            <select 
              value={empTypeFilter}
              onChange={handleEmpTypeFilterChange}
              className="std-page-select"
              style={{ padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="">All Employment Types</option>
              {employmentTypes.map((type) => (
                <option key={type.id || type.employmentTypeId} value={type.id || type.employmentTypeId}>
                  {type.name || type.employmentTypeName || type.type || type.description}
                </option>
              ))}
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="std-page-select"
              style={{ padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button className="std-btn" onClick={() => fetchMappings(empTypeFilter)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          
          <div className="std-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="std-table">
              <thead>
                <tr>
                  <th>Employment Type</th>
                  <th>Document Type</th>
                  <th>Code</th>
                  <th>Mandatory</th>
                  <th>Created Date</th>
                  <th>Modified Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={5} cols={8} />
                ) : error ? (
                  <TableError cols={8} message={error} onRetry={() => fetchMappings(empTypeFilter)} />
                ) : filteredMappings.length === 0 ? (
                  <TableEmpty
                    cols={8}
                    icon={FileText}
                    title="No mappings found"
                    message="There are no document mappings matching your criteria."
                  />
                ) : (
                  filteredMappings.map((mapping) => (
                    <tr key={mapping.employmentTypeDocumentMappingId || mapping.id}>
                      <td>{getEmpTypeName(mapping.employmentTypeId)}</td>
                      <td>{getDocTypeName(mapping.documentTypeId)}</td>
                      <td>{getDocTypeCode(mapping.documentTypeId)}</td>
                      <td>
                        {mapping.isMandatory ? (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', fontWeight: '500' }}>Mandatory</span>
                        ) : (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '500' }}>Optional</span>
                        )}
                      </td>
                      <td>{mapping.createdDate ? new Date(mapping.createdDate).toLocaleDateString() : '-'}</td>
                      <td>{mapping.modifiedDate ? new Date(mapping.modifiedDate).toLocaleDateString() : '-'}</td>
                      <td>
                        {mapping.isActive ? (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', fontWeight: '500' }}>Active</span>
                        ) : (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: '500' }}>Inactive</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="icon-btn-square edit-btn" onClick={() => setModalState({ isOpen: true, mapping })} title="Edit Mapping">
                            <Edit size={14} />
                          </button>
                          <button className="icon-btn-square trash-btn" onClick={() => setDeleteModal({ isOpen: true, id: mapping.employmentTypeDocumentMappingId || mapping.id })} title="Delete Mapping">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
      
      <MappingModal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mapping: null })}
        onSave={handleSaveMapping}
        mapping={modalState.mapping}
        employmentTypes={employmentTypes}
        documentTypes={documentTypes}
      />

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Mapping"
        message="Are you sure you want to delete this mapping? This action cannot be undone."
      />

      {toast.show && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem',
          backgroundColor: toast.isError ? '#fee2e2' : '#dcfce7',
          color: toast.isError ? '#991b1b' : '#166534',
          padding: '1rem 1.5rem', borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          zIndex: 10000,
          animation: 'modalPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <CheckCircle2 size={20} />
          <div>
            <div style={{ fontWeight: 600 }}>{toast.isError ? 'Error' : 'Success'}</div>
            <div style={{ fontSize: '0.875rem' }}>{toast.message}</div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EmploymentTypeDocumentMapping;
