import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Edit, Users as UsersIcon, Star, Search, X } from 'lucide-react';
import '../../styles/StandardUI.css';
import ConfirmModal from '../../components/common/ConfirmModal/ConfirmModal';
import { userService } from '../../services/userService';
import HasPermission from '../../components/common/HasPermission/HasPermission';
import { TableSkeleton, TableEmpty, TableError } from '../../components/common/TableStates/TableStates';

const Users = () => {
  const navigate = useNavigate();
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      const usersList = Array.isArray(data) ? data : (data.users || []);
      
      const mergedUsers = await Promise.all(usersList.map(async (user) => {
        try {
          const customer = await userService.getCustomerDetails(user.userId);
          return { ...user, ...customer };
        } catch (err) {
          console.error(`Failed to fetch customer details for user ${user.userId}`, err);
          return user;
        }
      }));
      
      setUsersData(mergedUsers);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };


  const confirmDelete = () => {
    alert("User deletion is not currently supported via API in read-only management.");
    setDeleteModal({ isOpen: false, id: null });
  };

  const filteredData = usersData.filter(u => 
    `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredLength = filteredData.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  return (
    <DashboardLayout title="User Management" hideSidebar={true}>
      <div className="std-page">
        <div className="std-container std-list-view">
          <div className="std-header">
            <div className="std-header-left">
              <UsersIcon size={20} />
              <h2>User Management</h2>
            </div>
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
                placeholder="Search users..." 
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
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Mobile Number</th>
                  <th>Gender</th>
                  <th>Email</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : error ? (
                  <TableError cols={6} message={error} onRetry={fetchUsers} />
                ) : filteredLength === 0 ? (
                  <TableEmpty
                    cols={6}
                    icon={UsersIcon}
                    title="No users found"
                    message={searchTerm ? 'No users match your search. Try a different term.' : 'Get started by creating your first user.'}
                  />
                ) : (
                  paginatedData.map((user) => (
                    <tr key={user.userId || user.id}>
                      <td>{user.firstName}</td>
                      <td>{user.lastName}</td>
                      <td>{user.mobileNumber}</td>
                      <td>{user.gender}</td>
                      <td>{user.email}</td>
                      <td className="actions-cell">
                        <div className="action-buttons-group" style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.75rem' }}>
                          <HasPermission permission="Users_View">
                            <button className="icon-btn-square users-action-btn" title="View / Assign Groups" onClick={() => navigate(`/users/groups/${user.userId || user.id}`)}>
                              <UsersIcon size={16} />
                            </button>
                          </HasPermission>
                          <HasPermission permission="Users_View">
                            <button className="icon-btn-square star-btn" title="View Permissions" onClick={() => navigate(`/users/permissions/${user.userId || user.id}`)}>
                              <Star size={16} />
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
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
      />
    </DashboardLayout>
  );
};

export default Users;
