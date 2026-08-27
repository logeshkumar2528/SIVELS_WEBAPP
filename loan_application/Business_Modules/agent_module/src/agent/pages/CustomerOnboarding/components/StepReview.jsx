import React from 'react';
import { ArrowLeft, Save, Edit2 } from 'lucide-react';

const StepReview = ({ formData, masters, onEditStep, onSubmit, onBack, loading }) => {
  const getMasterName = (list, id, idField = 'id', nameField = 'name') => {
    if (!id) return '-';
    const item = list.find(x => String(x[idField] || x.id) === String(id) || String(x) === String(id));
    return item ? (item[nameField] || item.name || item.titleName || item.genderName || item.statusName || item.employmentTypeName || item.countryName || item.stateName || item.districtName || item.cityName || item) : id;
  };

  const selectedEmpType = masters.employmentTypes.find(e => 
    String(e.id || e.employmentTypeId) === String(formData.employmentTypeId)
  );
  const empTypeName = selectedEmpType ? (selectedEmpType.name || selectedEmpType.employmentTypeName || selectedEmpType.type || '').toLowerCase() : '';
  const isSalaried = empTypeName.includes('salar');
  const isBusiness = empTypeName.includes('business') || empTypeName.includes('self');

  return (
    <div>
      <div className="review-section">
        <h4>
          Customer Details
          <button type="button" className="edit-btn-text" onClick={() => onEditStep(1)}>
            <Edit2 size={14} /> Edit
          </button>
        </h4>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-label">Title</span>
            <span className="review-value">{getMasterName(masters.titles, formData.title)}</span>
          </div>
          <div className="review-item">
            <span className="review-label">First Name</span>
            <span className="review-value">{formData.firstName || '-'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Last Name</span>
            <span className="review-value">{formData.lastName || '-'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Mobile Number</span>
            <span className="review-value">{formData.mobileNumber || '-'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Email</span>
            <span className="review-value">{formData.email || '-'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Date of Birth</span>
            <span className="review-value">{formData.dateOfBirth || '-'}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Gender</span>
            <span className="review-value">{getMasterName(masters.genders, formData.gender)}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Marital Status</span>
            <span className="review-value">{getMasterName(masters.maritalStatuses, formData.maritalStatus)}</span>
          </div>
        </div>
      </div>

      <div className="review-section">
        <h4>
          Employment / Business
          <button type="button" className="edit-btn-text" onClick={() => onEditStep(2)}>
            <Edit2 size={14} /> Edit
          </button>
        </h4>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-label">Employment Type</span>
            <span className="review-value">{getMasterName(masters.employmentTypes, formData.employmentTypeId, 'employmentTypeId', 'employmentTypeName')}</span>
          </div>
          
          {isSalaried && (
            <>
              <div className="review-item">
                <span className="review-label">Employer Name</span>
                <span className="review-value">{formData.employerName || '-'}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Designation</span>
                <span className="review-value">{formData.designation || '-'}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Salary</span>
                <span className="review-value">{formData.salary ? `₹${formData.salary}` : '-'}</span>
              </div>
            </>
          )}

          {isBusiness && (
            <>
              <div className="review-item">
                <span className="review-label">GST Number</span>
                <span className="review-value">{formData.gstNumber || '-'}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Annual Turnover</span>
                <span className="review-value">{formData.annualTurnover ? `₹${formData.annualTurnover}` : '-'}</span>
              </div>
              <div className="review-item" style={{ gridColumn: '1 / -1' }}>
                <span className="review-label">Nature of Business</span>
                <span className="review-value">{formData.natureOfBusiness || '-'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="review-section">
        <h4>
          Current Address
          <button type="button" className="edit-btn-text" onClick={() => onEditStep(3)}>
            <Edit2 size={14} /> Edit
          </button>
        </h4>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-label">Country</span>
            <span className="review-value">{getMasterName(masters.countries, formData.currentCountry, 'countryId', 'countryName')}</span>
          </div>
          <div className="review-item">
            <span className="review-label">State</span>
            <span className="review-value">{getMasterName(masters.states, formData.currentState, 'stateId', 'stateName')}</span>
          </div>
          <div className="review-item">
            <span className="review-label">District</span>
            <span className="review-value">{getMasterName(masters.districts, formData.currentDistrict, 'districtId', 'districtName')}</span>
          </div>
          <div className="review-item">
            <span className="review-label">City</span>
            <span className="review-value">{getMasterName(masters.cities, formData.currentCity, 'cityId', 'cityName')}</span>
          </div>
          <div className="review-item" style={{ gridColumn: '1 / -1' }}>
            <span className="review-label">Address Line</span>
            <span className="review-value">{formData.currentAddress || '-'}</span>
          </div>
        </div>
      </div>

      <div className="review-section">
        <h4>
          Permanent Address
          <button type="button" className="edit-btn-text" onClick={() => onEditStep(3)}>
            <Edit2 size={14} /> Edit
          </button>
        </h4>
        {formData.sameAsCurrent ? (
          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', color: '#475569', fontSize: '0.9rem' }}>
            Same as Current Address
          </div>
        ) : (
          <div className="review-grid">
            <div className="review-item">
              <span className="review-label">Country</span>
              <span className="review-value">{getMasterName(masters.countries, formData.permanentCountry, 'countryId', 'countryName')}</span>
            </div>
            <div className="review-item">
              <span className="review-label">State</span>
              <span className="review-value">{getMasterName(masters.states, formData.permanentState, 'stateId', 'stateName')}</span>
            </div>
            <div className="review-item">
              <span className="review-label">District</span>
              <span className="review-value">{getMasterName(masters.districts, formData.permanentDistrict, 'districtId', 'districtName')}</span>
            </div>
            <div className="review-item">
              <span className="review-label">City</span>
              <span className="review-value">{getMasterName(masters.cities, formData.permanentCity, 'cityId', 'cityName')}</span>
            </div>
            <div className="review-item" style={{ gridColumn: '1 / -1' }}>
              <span className="review-label">Address Line</span>
              <span className="review-value">{formData.permanentAddress || '-'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="std-btn std-btn-secondary" onClick={onBack} disabled={loading}>
          <ArrowLeft size={16} /> Back
        </button>
        <button type="button" className="std-btn std-btn-primary" onClick={onSubmit} disabled={loading} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
          <Save size={16} /> {loading ? 'Submitting...' : 'Submit Customer'}
        </button>
      </div>
    </div>
  );
};

export default StepReview;
