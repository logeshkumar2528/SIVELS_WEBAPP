import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import { Save, Users } from 'lucide-react';
import '../../styles/StandardUI.css';


const CreateUser = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    gender: '',
    email: ''
  });


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    const saved = localStorage.getItem('mockUsers');
    let parsed = saved ? JSON.parse(saved) : [];
    
    const newId = parsed.length > 0 ? Math.max(...parsed.map(u => u.id)) + 1 : 1;
    parsed.push({ 
      id: newId, 
      username: formData.email.split('@')[0], // mock username based on email
      ...formData 
    });
    
    localStorage.setItem('mockUsers', JSON.stringify(parsed));
    navigate('/users');
  };

  return (
    <DashboardLayout title="Add New User" hideSidebar={true}>
      <div className="std-page">
        <div className="std-container">
          
          <div className="std-header">
            <div className="std-header-left">
              <Users size={20} />
              <h2>Add New User</h2>
            </div>
          </div>
          
          <div className="std-content">
            <form onSubmit={handleSave}>
              <div className="std-form-grid">
                <div className="std-form-group">
                  <label htmlFor="firstName" className="std-form-label">First Name</label>
                  <input type="text" id="firstName" className="std-form-input" required
                    placeholder="Enter first name"
                    value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="std-form-group">
                  <label htmlFor="lastName" className="std-form-label">Last Name</label>
                  <input type="text" id="lastName" className="std-form-input" required
                    placeholder="Enter last name"
                    value={formData.lastName} onChange={handleChange} />
                </div>
                <div className="std-form-group">
                  <label htmlFor="mobile" className="std-form-label">Mobile Number</label>
                  <input type="text" id="mobile" className="std-form-input" required
                    placeholder="Enter mobile number"
                    value={formData.mobile} onChange={handleChange} />
                </div>
                <div className="std-form-group">
                  <label htmlFor="gender" className="std-form-label">Gender</label>
                  <select id="gender" className="std-form-select" required
                    value={formData.gender} onChange={handleChange}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="std-form-group">
                  <label htmlFor="email" className="std-form-label">Email</label>
                  <input type="email" id="email" className="std-form-input" required
                    placeholder="name@example.com"
                    value={formData.email} onChange={handleChange} />
                </div>
              </div>

                <div className="std-actions">
                  <button type="submit" className="std-btn std-btn-primary">
                    <Save size={16} />
                    Save
                  </button>
                  <button type="button" className="std-btn std-btn-secondary" onClick={() => navigate('/users')} style={{ pointerEvents: 'auto' }}>
                    Cancel
                  </button>
                </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateUser;
