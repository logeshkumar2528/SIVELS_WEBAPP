import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import DatePicker from '../../components/DatePicker/DatePicker';
import { ROUTES } from '../../config/routeConfig';
import { agentApi } from '../../services/agentApi';
import { masterService } from '../../../../../Core/src/services/masterService';
import './AgentCreation.css';

export default function AgentCreation() {
  const navigate = useNavigate();
  const [genders, setGenders] = useState([]);
  const [isGendersLoading, setIsGendersLoading] = useState(true);
  const [gendersError, setGendersError] = useState('');

  useEffect(() => {
    const fetchGenders = async () => {
      try {
        const data = await masterService.getGenders();
        const activeGenders = data
          .filter(g => g.isActive)
          .map(g => ({
            value: g.genderId,
            label: g.genderName
          }));
        setGenders(activeGenders);
      } catch (err) {
        setGendersError('Failed to load genders.');
      } finally {
        setIsGendersLoading(false);
      }
    };
    fetchGenders();
  }, []);

  const [form, setForm] = useState({
    fullName: 'Ramesh Kumar',
    dateOfBirth: '1990-05-15',
    genderId: '',
    rmId: '',
    address: '12 Gandhi Street, RS Puram',
    state: 'Tamil Nadu',
    pincode: '641002',
    mobileNumber: '9876543210',
    emailAddress: 'ramesh.kumar@example.com',
    dateJoined: '2024-01-10',
    role: 'Field Agent',
    branch: 'Coimbatore',
    isActive: true,
    bankAccountNumber: '123456789012',
    ifscCode: 'HDFC0001234',
  });

  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [errors, setErrors] = useState({});

  const aadhaarInputRef = useRef(null);
  const profileInputRef = useRef(null);

  const SaveIcon = iconMap['Save'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const FileIcon = iconMap['FileText'];

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateFile = (file, type) => {
    if (!file) return `${type === 'aadhaar' ? 'Aadhaar Card' : 'Profile Image'} is required.`;
    
    const validAadhaarTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const validProfileTypes = ['image/jpeg', 'image/png'];
    
    if (type === 'aadhaar') {
      if (!validAadhaarTypes.includes(file.type)) return 'Please upload a JPG, JPEG, PNG or PDF file.';
      if (file.size > 10 * 1024 * 1024) return 'Aadhaar Card file size must not exceed 10 MB.';
    } else {
      if (!validProfileTypes.includes(file.type)) return 'Please upload a JPG, JPEG or PNG image.';
      if (file.size > 5 * 1024 * 1024) return 'Profile Image file size must not exceed 5 MB.';
    }
    return '';
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const error = validateFile(file, type);
    if (type === 'aadhaar') {
      if (!error) {
        setAadhaarFile(Object.assign(file, { preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null }));
      } else {
        setAadhaarFile(null);
      }
      setErrors((prev) => ({ ...prev, aadhaar: error }));
    } else {
      if (!error) {
        setProfileImageFile(Object.assign(file, { preview: URL.createObjectURL(file) }));
      } else {
        setProfileImageFile(null);
      }
      setErrors((prev) => ({ ...prev, profile: error }));
    }
    
    e.target.value = null;
  };

  const removeFile = (type) => {
    if (type === 'aadhaar') {
      setAadhaarFile(null);
      setErrors((prev) => ({ ...prev, aadhaar: 'Aadhaar Card is required.' }));
    } else {
      setProfileImageFile(null);
      setErrors((prev) => ({ ...prev, profile: 'Profile Image is required.' }));
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const newErrors = {};
    const requiredFields = ['fullName', 'dateOfBirth', 'genderId', 'rmId', 'address', 'state', 'pincode', 'mobileNumber', 'emailAddress', 'dateJoined', 'role', 'branch', 'bankAccountNumber', 'ifscCode'];
    
    requiredFields.forEach(field => {
      if (form[field] === undefined || form[field] === null || String(form[field]).trim() === '') {
        newErrors[field] = 'This field is required.';
      }
    });

    const aadhaarError = validateFile(aadhaarFile, 'aadhaar');
    if (aadhaarError) newErrors.aadhaar = aadhaarError;

    const profileError = validateFile(profileImageFile, 'profile');
    if (profileError) newErrors.profile = profileError;

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSaving(true);
      try {
        const payload = {
          ...form,
          genderId: Number(form.genderId),
          rmId: form.rmId,
          isActive: true,
          createdBy: form.rmId
        };
        
        const createRes = await agentApi.createAgent(payload);
        const agentId = createRes.agentId;

        await agentApi.uploadAadhaar(agentId, aadhaarFile);
        await agentApi.uploadProfileImage(agentId, profileImageFile);

        alert("Agent created successfully!");
        navigate(ROUTES.MY_AGENTS);
      } catch (err) {
        console.error(err);
        let errorMsg = "Failed to save agent.";
        if (err.errors) {
          const messages = [];
          Object.values(err.errors).forEach(val => {
            if (Array.isArray(val)) messages.push(...val);
            else messages.push(val);
          });
          errorMsg = messages.join('\\n');
        } else if (err.message) {
          errorMsg = err.message;
        } else if (typeof err === 'string') {
          errorMsg = err;
        }
        alert(errorMsg);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="page-container ac-page-root">
      <header className="ac-header">
        <div className="ac-title-group">
          <div className="ac-icon-wrapper">
            {iconMap['UserPlus'] && (() => { const UserPlus = iconMap['UserPlus']; return <UserPlus size={20} strokeWidth={2.5} />; })()}
          </div>
          <div>
            <h1 className="ac-page-title">Agent Creation</h1>
            <p className="ac-page-description">Create a new field agent profile.</p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
          onClick={() => navigate(ROUTES.MY_AGENTS)}
        >
          Back to Agents
        </Button>
      </header>

      <div className="panel ac-form-card">
        <div className="ac-form-body">
          <div className="ac-section-title">Agent Information</div>
          
          <div className="ac-form-grid">
            <div className="ac-field">
              <label className="form-label">Full Name *</label>
              <input
                className={`form-input ${errors.fullName ? 'ac-input-error' : ''}`}
                type="text"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
              />
              {errors.fullName && <span className="ac-error-text">{errors.fullName}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Date of Birth *</label>
              <DatePicker
                value={form.dateOfBirth}
                onChange={(val) => handleChange('dateOfBirth', val)}
                placeholder="YYYY-MM-DD"
              />
              {errors.dateOfBirth && <span className="ac-error-text">{errors.dateOfBirth}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Gender *</label>
              <Select
                value={form.genderId}
                onChange={(val) => handleChange('genderId', val)}
                placeholder={isGendersLoading ? "Loading..." : "Select Gender"}
                options={genders}
                disabled={isGendersLoading}
              />
              {gendersError && <span className="ac-error-text" style={{ display: 'block', marginTop: '4px' }}>{gendersError}</span>}
              {errors.genderId && <span className="ac-error-text">{errors.genderId}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Relationship Manager *</label>
              <input
                className={`form-input ${errors.rmId ? 'ac-input-error' : ''}`}
                type="text"
                placeholder="Enter Relationship Manager Name"
                value={form.rmId}
                onChange={(e) => handleChange('rmId', e.target.value)}
              />
              {errors.rmId && <span className="ac-error-text">{errors.rmId}</span>}
            </div>

            <div className="ac-field ac-field--full">
              <label className="form-label">Address *</label>
              <textarea
                className={`form-input ${errors.address ? 'ac-input-error' : ''}`}
                rows={2}
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
              {errors.address && <span className="ac-error-text">{errors.address}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">State *</label>
              <input
                className={`form-input ${errors.state ? 'ac-input-error' : ''}`}
                type="text"
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
              />
              {errors.state && <span className="ac-error-text">{errors.state}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Pincode *</label>
              <input
                className={`form-input ${errors.pincode ? 'ac-input-error' : ''}`}
                type="text"
                value={form.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
              />
              {errors.pincode && <span className="ac-error-text">{errors.pincode}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Mobile Number *</label>
              <input
                className={`form-input ${errors.mobileNumber ? 'ac-input-error' : ''}`}
                type="tel"
                maxLength={10}
                value={form.mobileNumber}
                onChange={(e) => handleChange('mobileNumber', e.target.value)}
              />
              {errors.mobileNumber && <span className="ac-error-text">{errors.mobileNumber}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Email Address *</label>
              <input
                className={`form-input ${errors.emailAddress ? 'ac-input-error' : ''}`}
                type="email"
                value={form.emailAddress}
                onChange={(e) => handleChange('emailAddress', e.target.value)}
              />
              {errors.emailAddress && <span className="ac-error-text">{errors.emailAddress}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Date Joined *</label>
              <DatePicker
                value={form.dateJoined}
                onChange={(val) => handleChange('dateJoined', val)}
                placeholder="YYYY-MM-DD"
              />
              {errors.dateJoined && <span className="ac-error-text">{errors.dateJoined}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Role *</label>
              <input
                className={`form-input ${errors.role ? 'ac-input-error' : ''}`}
                type="text"
                value={form.role}
                onChange={(e) => handleChange('role', e.target.value)}
              />
              {errors.role && <span className="ac-error-text">{errors.role}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">Branch *</label>
              <input
                className={`form-input ${errors.branch ? 'ac-input-error' : ''}`}
                type="text"
                value={form.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
              />
              {errors.branch && <span className="ac-error-text">{errors.branch}</span>}
            </div>
            
            <div className="ac-field">
              <label className="form-label">Bank Account Number *</label>
              <input
                className={`form-input ${errors.bankAccountNumber ? 'ac-input-error' : ''}`}
                type="text"
                value={form.bankAccountNumber}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
              />
              {errors.bankAccountNumber && <span className="ac-error-text">{errors.bankAccountNumber}</span>}
            </div>

            <div className="ac-field">
              <label className="form-label">IFSC Code *</label>
              <input
                className={`form-input ${errors.ifscCode ? 'ac-input-error' : ''}`}
                type="text"
                value={form.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value)}
              />
              {errors.ifscCode && <span className="ac-error-text">{errors.ifscCode}</span>}
            </div>
          </div>

          <div className="ac-section-title" style={{ marginTop: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--color-primary-50, #dcfce7)', padding: '6px', borderRadius: '8px', display: 'flex', color: 'var(--color-primary, #166534)' }}>
              {iconMap['FileText'] && (() => { const FileText = iconMap['FileText']; return <FileText size={18} strokeWidth={2} />; })()}
            </div>
            Required Documents
          </div>
          
          <div className="ac-documents-grid">
            <div className={`ac-doc-card ${errors.aadhaar ? 'ac-doc-card-error' : ''}`}>
              <div className="ac-doc-card-header">
                <div className="ac-doc-icon">
                  {iconMap['FileCheck'] && (() => { const FileCheck = iconMap['FileCheck']; return <FileCheck size={20} strokeWidth={2} />; })()}
                </div>
                <div className="ac-doc-info">
                  <div className="ac-doc-title">Aadhaar Card <span className="ac-required">*</span></div>
                  <div className="ac-doc-subtitle">Upload clear image of Aadhaar Card</div>
                  <div className="ac-doc-help">JPG, PNG or PDF (Max. 10MB)</div>
                </div>
              </div>
              {aadhaarFile && (
                <div className="ac-doc-preview-area">
                  {aadhaarFile.preview ? (
                    <img src={aadhaarFile.preview} alt="Aadhaar Preview" className="ac-doc-preview-img" />
                  ) : (
                    <div className="ac-doc-file-icon">{iconMap['FileText'] && (() => { const FileText = iconMap['FileText']; return <FileText size={20} />; })()}</div>
                  )}
                  <span className="ac-doc-filename">{aadhaarFile.name}</span>
                  <span className="ac-doc-remove" onClick={() => removeFile('aadhaar')}>Remove</span>
                </div>
              )}
              <Button 
                variant="outline" 
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => aadhaarInputRef.current.click()}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                  {iconMap['Upload'] && (() => { const Upload = iconMap['Upload']; return <Upload size={16} strokeWidth={2} />; })()}
                  {aadhaarFile ? 'Replace Document' : 'Upload Document'}
                </span>
              </Button>
              <input 
                type="file" 
                ref={aadhaarInputRef} 
                style={{ display: 'none' }} 
                accept=".jpg,.jpeg,.png,.pdf" 
                onChange={(e) => handleFileChange(e, 'aadhaar')} 
              />
              {errors.aadhaar && <div className="ac-error-text" style={{marginTop: '8px'}}>{errors.aadhaar}</div>}
            </div>

            <div className={`ac-doc-card ${errors.profile ? 'ac-doc-card-error' : ''}`}>
              <div className="ac-doc-card-header">
                <div className="ac-doc-icon">
                  {iconMap['UserCircle'] && (() => { const UserCircle = iconMap['UserCircle']; return <UserCircle size={20} strokeWidth={2} />; })()}
                </div>
                <div className="ac-doc-info">
                  <div className="ac-doc-title">Profile Image <span className="ac-required">*</span></div>
                  <div className="ac-doc-subtitle">Upload clear image of Profile Image</div>
                  <div className="ac-doc-help">JPG, PNG (Max. 5MB)</div>
                </div>
              </div>
              {profileImageFile && (
                <div className="ac-doc-preview-area">
                  <img src={profileImageFile.preview} alt="Profile Preview" className="ac-doc-preview-img" />
                  <span className="ac-doc-filename">{profileImageFile.name}</span>
                  <span className="ac-doc-remove" onClick={() => removeFile('profile')}>Remove</span>
                </div>
              )}
              <Button 
                variant="outline" 
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => profileInputRef.current.click()}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                  {iconMap['Upload'] && (() => { const Upload = iconMap['Upload']; return <Upload size={16} strokeWidth={2} />; })()}
                  {profileImageFile ? 'Replace Document' : 'Upload Document'}
                </span>
              </Button>
              <input 
                type="file" 
                ref={profileInputRef} 
                style={{ display: 'none' }} 
                accept=".jpg,.jpeg,.png" 
                onChange={(e) => handleFileChange(e, 'profile')} 
              />
              {errors.profile && <div className="ac-error-text" style={{marginTop: '8px'}}>{errors.profile}</div>}
            </div>
          </div>

        </div>

        <div className="ac-form-footer">
          <Button
            variant="secondary"
            onClick={() => navigate(ROUTES.MY_AGENTS)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={SaveIcon ? <SaveIcon size={14} /> : null}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Agent'}
          </Button>
        </div>
      </div>
    </div>
  );
}
