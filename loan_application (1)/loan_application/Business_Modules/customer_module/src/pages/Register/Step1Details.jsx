import React from 'react';
import { User, Calendar, MapPin, Briefcase, IndianRupee, Mail, Users, ArrowRight, RotateCcw, Home, Store, FileText, X } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect/CustomSelect';
import './Register.css'; // Uses shared styles

export default function Step1Details({ initialData, onNext }) {
  const [formData, setFormData] = React.useState({
    gender: "",
    maritalStatus: "",
    nominee1Rel: "",
    nominee2Rel: "",
    businessNature: ""
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Basic Details */}
      <div className="form-section">
        <div className="section-header">
          <User size={18} className="section-icon" color="var(--color-primary)" />
          <h3 style={{ color: 'var(--color-primary)' }}>Basic Details</h3>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>First Name <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input type="text" className="form-input" placeholder="Enter first name" />
            </div>
          </div>
          <div className="form-group">
            <label>Last Name <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input type="text" className="form-input" placeholder="Enter last name" />
            </div>
          </div>
          <div className="form-group">
            <label>Date of Birth <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon" />
              <input type="date" className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label>Gender <span className="required-asterisk">*</span></label>
            <CustomSelect 
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" }
              ]}
              value={formData.gender}
              onChange={(v) => handleChange("gender", v)}
              placeholder="Select gender"
            />
          </div>
          
          <div className="form-group">
            <label>Marital Status <span className="required-asterisk">*</span></label>
            <CustomSelect 
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married" }
              ]}
              value={formData.maritalStatus}
              onChange={(v) => handleChange("maritalStatus", v)}
              placeholder="Select marital status"
            />
          </div>
          <div className="form-group">
            <label>Mobile Number <span className="required-asterisk">*</span></label>
            <div className="input-group">
              <span className="input-prefix">+91</span>
              <input type="tel" className="form-input with-prefix" placeholder="Enter mobile number" />
            </div>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Email Address <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input type="email" className="form-input" placeholder="Enter email address" />
            </div>
          </div>
        </div>
      </div>

      {/* Address Details */}
      <div className="form-section">
        <div className="section-header">
          <Home size={18} className="section-icon" color="var(--color-primary)" />
          <h3 style={{ color: 'var(--color-primary)' }}>Address Details</h3>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr auto 1fr', alignItems: 'end' }}>
          <div className="form-group">
            <label>Current Address <span className="required-asterisk">*</span></label>
            <div className="input-with-icon-right">
              <input type="text" className="form-input" placeholder="Enter current address" />
              <MapPin size={16} className="input-icon-right" />
            </div>
          </div>
          
          <div style={{ paddingBottom: '12px', paddingLeft: '8px', paddingRight: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
              <input type="checkbox" /> Same as current address
            </label>
          </div>

          <div className="form-group">
            <label>Permanent Address <span className="required-asterisk">*</span></label>
            <div className="input-with-icon-right">
              <input type="text" className="form-input" placeholder="Enter permanent address" />
              <MapPin size={16} className="input-icon-right" />
            </div>
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className="form-section">
        <div className="section-header">
          <Briefcase size={18} className="section-icon" color="var(--color-primary)" />
          <h3 style={{ color: 'var(--color-primary)' }}>Employment Details</h3>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="form-group">
            <label>Employer Name <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input type="text" className="form-input" placeholder="Enter employer name" />
            </div>
          </div>
          <div className="form-group">
            <label>Designation <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input type="text" className="form-input" placeholder="Enter designation" />
            </div>
          </div>
          <div className="form-group">
            <label>Monthly Salary <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <IndianRupee size={16} className="input-icon" />
              <input type="number" className="form-input" placeholder="Enter monthly salary" />
            </div>
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="form-section">
        <div className="section-header">
          <Store size={18} className="section-icon" color="var(--color-primary)" />
          <h3 style={{ color: 'var(--color-primary)' }}>Business Details</h3>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="form-group">
            <label>GST Number</label>
            <div className="input-with-icon">
              <FileText size={16} className="input-icon" />
              <input type="text" className="form-input" placeholder="Enter GST number" />
            </div>
          </div>
          <div className="form-group">
            <label>Annual Turnover (₹) <span className="required-asterisk">*</span></label>
            <div className="input-with-icon">
              <IndianRupee size={16} className="input-icon" />
              <input type="number" className="form-input" placeholder="Enter annual turnover" />
            </div>
          </div>
          <div className="form-group">
            <label>Business Nature <span className="required-asterisk">*</span></label>
            <CustomSelect 
              options={[
                { value: "retail", label: "Retail" },
                { value: "wholesale", label: "Wholesale" },
                { value: "manufacturing", label: "Manufacturing" },
                { value: "services", label: "Services" }
              ]}
              value={formData.businessNature}
              onChange={(v) => handleChange("businessNature", v)}
              placeholder="Select business nature"
            />
          </div>
        </div>
      </div>

      {/* Reference Details */}
      <div className="form-section">
        <div className="section-header">
          <Users size={18} className="section-icon" color="var(--color-primary)" />
          <h3 style={{ color: 'var(--color-primary)' }}>Reference Details</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', position: 'relative' }}>
          
          {/* Reference 1 */}
          <div>
            <h4 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--color-primary)' }}>Reference 1</h4>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label>Name <span className="required-asterisk">*</span></label>
                <input type="text" className="form-input" placeholder="Enter reference name" />
              </div>
              <div className="form-group">
                <label>Relationship <span className="required-asterisk">*</span></label>
                <CustomSelect 
                  options={[
                    { value: "family", label: "Family" },
                    { value: "friend", label: "Friend" }
                  ]}
                  value={formData.nominee1Rel}
                  onChange={(v) => handleChange("nominee1Rel", v)}
                  placeholder="Select relationship"
                />
              </div>
              <div className="form-group">
                <label>Mobile Number <span className="required-asterisk">*</span></label>
                <div className="input-group">
                  <span className="input-prefix">+91</span>
                  <input type="tel" className="form-input with-prefix" placeholder="Enter mobile number" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Vertical Divider */}
          <div style={{ 
            position: 'absolute', 
            left: '50%', 
            top: '0',
            bottom: '0',
            transform: 'translateX(-50%)', 
            width: '1px', 
            backgroundColor: 'var(--color-border)'
          }}></div>

          {/* Reference 2 */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h4 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--color-primary)' }}>Reference 2</h4>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="form-input" placeholder="Enter reference name" />
              </div>
              <div className="form-group">
                <label>Relationship</label>
                <CustomSelect 
                  options={[
                    { value: "family", label: "Family" },
                    { value: "friend", label: "Friend" }
                  ]}
                  value={formData.nominee2Rel}
                  onChange={(v) => handleChange("nominee2Rel", v)}
                  placeholder="Select relationship"
                />
              </div>
              <div className="form-group">
                <label>Mobile Number</label>
                <div className="input-group">
                  <span className="input-prefix">+91</span>
                  <input type="tel" className="form-input with-prefix" placeholder="Enter mobile number" />
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn-secondary" style={{ backgroundColor: 'white', color: '#EF4444', borderColor: '#FCA5A5' }}>
            <X size={16} />
            <span>Cancel</span>
          </button>
          <button type="reset" className="btn-secondary" style={{ backgroundColor: 'white' }}>
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
        <button type="submit" className="btn-primary small" style={{ padding: '12px 24px', backgroundColor: 'var(--color-primary)' }}>
          <span>Next: Upload Documents</span>
          <ArrowRight size={16} />
        </button>
      </div>

    </form>
  );
}
