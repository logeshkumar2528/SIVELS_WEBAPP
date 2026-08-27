import React from 'react';
import { ArrowRight } from 'lucide-react';

const StepCustomerDetails = ({ formData, handleChange, masters, onNext }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.mobileNumber || !formData.dateOfBirth || !formData.gender || !formData.maritalStatus) {
      alert("Please fill in all required fields.");
      return;
    }
    if (formData.mobileNumber.length !== 10 || !/^\d{10}$/.test(formData.mobileNumber)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    onNext();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="std-grid-cols-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title</label>
          <select name="title" value={formData.title} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
            <option value="">Select Title</option>
            {masters.titles.map((t, i) => (
              <option key={i} value={t.name || t.id || t}>{t.name || t.titleName || t}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>First Name <span style={{color: 'red'}}>*</span></label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="First Name" />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Last Name <span style={{color: 'red'}}>*</span></label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Last Name" />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Mobile Number <span style={{color: 'red'}}>*</span></label>
          <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} required maxLength={10} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="10-digit number" />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Email (Optional)" />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Date of Birth <span style={{color: 'red'}}>*</span></label>
          <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Gender <span style={{color: 'red'}}>*</span></label>
          <select name="gender" value={formData.gender} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
            <option value="">Select Gender</option>
            {masters.genders.map((g, i) => (
              <option key={i} value={g.name || g.id || g.genderName || g}>{g.name || g.genderName || g}</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Marital Status <span style={{color: 'red'}}>*</span></label>
          <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
            <option value="">Select Marital Status</option>
            {masters.maritalStatuses.map((m, i) => (
              <option key={i} value={m.name || m.id || m.statusName || m}>{m.name || m.statusName || m}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="form-actions">
        <button type="submit" className="std-btn std-btn-primary">
          Save & Next <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
};

export default StepCustomerDetails;
