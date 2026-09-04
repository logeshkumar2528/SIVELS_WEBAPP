import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const StepEmployment = ({ formData, handleChange, masters, onNext, onBack }) => {
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employmentTypeId) {
      setError('Please select an Employment Type.');
      return;
    }
    setError('');
    onNext();
  };

  const selectedEmpType = masters.employmentTypes.find(e => 
    String(e.id || e.employmentTypeId) === String(formData.employmentTypeId)
  );
  
  const empTypeName = selectedEmpType ? (selectedEmpType.name || selectedEmpType.employmentTypeName || selectedEmpType.type || '').toLowerCase() : '';
  
  const isSalaried = empTypeName.includes('salar');
  const isBusiness = empTypeName.includes('business') || empTypeName.includes('self');

  return (
    <form onSubmit={handleSubmit}>
      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid #fed7aa',
            background: '#fffbeb',
            color: '#9a3412',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Employment Type <span style={{color: 'red'}}>*</span></label>
        <select name="employmentTypeId" value={formData.employmentTypeId} onChange={handleChange} required style={{ width: '100%', maxWidth: '400px', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
          <option value="">Select Employment Type</option>
          {masters.employmentTypes.map((e, i) => (
            <option key={i} value={e.id || e.employmentTypeId}>{e.name || e.employmentTypeName || e.type}</option>
          ))}
        </select>
      </div>

      {isSalaried && (
        <div className="std-grid-cols-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Employer Name</label>
            <input type="text" name="employerName" value={formData.employerName} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Employer Name" />
          </div>
          
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Designation</label>
            <input type="text" name="designation" value={formData.designation} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Designation" />
          </div>
          
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Salary</label>
            <input type="number" name="salary" value={formData.salary} onChange={handleChange} min="0" style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Annual Salary" />
          </div>
        </div>
      )}

      {isBusiness && (
        <div className="std-grid-cols-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>GST Number</label>
            <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="GST Number" />
          </div>
          
          <div className="form-group" style={{ marginBottom: '0' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Annual Turnover</label>
            <input type="text" name="annualTurnover" value={formData.annualTurnover} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Annual Turnover" />
          </div>
          
          <div className="form-group" style={{ marginBottom: '0', gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nature of Business</label>
            <input type="text" name="natureOfBusiness" value={formData.natureOfBusiness} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="Nature of Business" />
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="std-btn std-btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <button type="submit" className="std-btn std-btn-primary">
          Save & Next <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
};

export default StepEmployment;
