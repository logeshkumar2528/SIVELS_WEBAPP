import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Plus, Edit, Shield, Trash2, Users, Search, X } from 'lucide-react';
import '../../styles/StandardUI.css';
import ConfirmModal from '../../components/common/ConfirmModal/ConfirmModal';
import { roleService } from '../../services/roleService';
import HasPermission from '../../components/common/HasPermission/HasPermission';
import { TableSkeleton, TableEmpty, TableError } from '../../components/common/TableStates/TableStates';

const Groups = () => {
  const navigate = useNavigate();
  const [groupsData, setGroupsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await roleService.getRoles();
      // Assume API returns an array, or data.roles. We use data directly if it's an array.
      setGroupsData(Array.isArray(data) ? data : (data.roles || []));
    } catch (err) {
      setError(err.message || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    try {
      await roleService.deleteRole(deleteModal.id);
      await fetchGroups(); // Refresh after delete
    } catch (err) {
      alert(err.message || 'Failed to delete group');
    } finally {
      setDeleteModal({ isOpen: false, id: null });
    }
  };

  const filteredData = groupsData.filter(g => (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLength = filteredData.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <DashboardLayout title="Groups Management" hideSidebar={true}>
      <div className="std-page">
        <div className="std-container std-list-view">
          
          <div className="std-header">
            <div className="std-header-left">
              <Users size={20} />
              <h2>Groups</h2>
            </div>
            
            <HasPermission permission="Groups_Create">
              <button className="std-btn std-btn-header-action" onClick={() => navigate('/groups/create')}>
                <Plus size={16} />
                Create New Group
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
                placeholder="Search groups..." 
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
                  <th>Group Name</th>
                  <th>Users</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={5} cols={3} />
                ) : error ? (
                  <TableError cols={3} message={error} onRetry={fetchGroups} />
                ) : filteredLength === 0 ? (
                  <TableEmpty
                    cols={3}
                    icon={Users}
                    title="No groups found"
                    message={searchTerm ? 'No groups match your search. Try a different term.' : 'Create your first group to get started.'}
                  />
                ) : (
                  paginatedData.map((group) => (
                    <tr key={group.id}>
                      <td>{group.name}</td>
                      <td>{group.usersCount} Users</td>
                      <td className="actions-cell">
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-start' }}>
                          <HasPermission permission="Groups_View">
                            <button className="icon-btn-square edit-btn" onClick={() => navigate(`/groups/edit/${group.id}`)} title="View / Edit Group">
                              <Edit size={16} />
                            </button>
                          </HasPermission>
                          <HasPermission permission="Groups_View">
                            <button className="icon-btn-square shield-btn" onClick={() => navigate(`/groups/permissions/${group.id}`)} title="Manage Permissions">
                              <Shield size={16} />
                            </button>
                          </HasPermission>
                          <HasPermission permission="Groups_Delete">
                            <button className="icon-btn-square trash-btn" onClick={() => handleDeleteClick(group.id)} title="Delete Group">
                              <Trash2 size={16} />
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
        title="Delete Group"
        message="Are you sure you want to delete this group? This action cannot be undone."
      />
    </DashboardLayout>
  );
};

export default Groups;
