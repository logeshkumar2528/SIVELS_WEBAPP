import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Plus, Edit, Trash2, Search, Shield, X } from 'lucide-react';
import '../../styles/StandardUI.css';
import ConfirmModal from '../../components/common/ConfirmModal/ConfirmModal';
import { permissionService } from '../../services/permissionService';
import HasPermission from '../../components/common/HasPermission/HasPermission';
import { TableSkeleton, TableEmpty, TableError } from '../../components/common/TableStates/TableStates';

const Roles = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [rolesData, setRolesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const data = await permissionService.getPermissions();
      setRolesData(Array.isArray(data) ? data : (data.permissions || []));
    } catch (err) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await permissionService.deletePermission(deleteModal.id);
      await fetchPermissions(); // Refresh
    } catch (err) {
      alert(err.message || 'Failed to delete role');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const filteredData = rolesData.filter(r => (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLength = filteredData.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <DashboardLayout title="Roles" hideSidebar={true}>
      <div className="std-page">

        <div className="std-container std-list-view">
          
          <div className="std-header">
            <div className="std-header-left">
              <Shield size={20} />
              <h2>Application Roles</h2>
            </div>
            
            <HasPermission permission="Roles_Create">
              <button className="std-btn std-btn-header-action" onClick={() => navigate('/roles/create')}>
                <Plus size={16} />
                Create New
              </button>
            </HasPermission>
          </div>
          
          <div className="std-table-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4B5563' }}>
              <span>Show</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="std-page-select"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>entries</span>
            </div>
            
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                placeholder="Search roles..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                style={{
                  padding: '0.4rem 2rem 0.4rem 2rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  width: '260px'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              {searchTerm && (
                <X 
                  size={14} 
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', cursor: 'pointer' }} 
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                />
              )}
            </div>
          </div>
          
          <div className="std-table-wrapper">
            <table className="std-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Menu Name</th>
                  <th>Controller Name</th>
                  <th>Menu Index</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : error ? (
                  <TableError cols={6} message={error} onRetry={fetchPermissions} />
                ) : filteredLength === 0 ? (
                  <TableEmpty
                    cols={6}
                    icon={Shield}
                    title="No roles found"
                    message={searchTerm ? 'No roles match your search. Try a different term.' : 'Create your first application role to get started.'}
                  />
                ) : (
                  paginatedData.map((role, _idx) => (
                    <tr key={role.id}>
                      <td>{role.name}</td>
                      <td>{role.description}</td>
                      <td>{role.menuName}</td>
                      <td>{role.controllerName}</td>
                      <td>{role.actionType}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <HasPermission permission="Roles_View">
                            <button className="icon-btn-square edit-btn" onClick={() => navigate(`/roles/edit/${role.id}`)} title="View / Edit Role">
                              <Edit size={14} />
                            </button>
                          </HasPermission>
                          <HasPermission permission="Roles_Delete">
                            <button className="icon-btn-square trash-btn" onClick={() => handleDeleteClick(role.id)} title="Delete Role">
                              <Trash2 size={14} />
                            </button>
                          </HasPermission>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="std-table-footer">
            <div>
              {(() => {
                if (filteredLength === 0) return 'Showing 0 records';
                const start = (currentPage - 1) * rowsPerPage + 1;
                const end = Math.min(currentPage * rowsPerPage, filteredLength);
                return `Showing ${start} to ${end} of ${filteredLength} records`;
              })()}
            </div>
            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              <button 
                className="pagination-btn" 
                disabled={currentPage * rowsPerPage >= filteredLength}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          </div>
          
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Role"
        message="Are you sure you want to delete this role? This action cannot be undone."
      />
    </DashboardLayout>
  );
};

export default Roles;
