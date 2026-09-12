import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Briefcase,
  Target,
  IndianRupee,
  AlertCircle,
  Info,
  CheckCircle2,
  ArrowRight,
  FileText,
  Upload,
  Trash2,
  Eye,
  X,
  CreditCard,
  IdCard,
  Landmark,
  RefreshCw,
} from 'lucide-react';
import Select from '../../components/Select/Select';
import { masterService } from '../../../../../Core/src/services/masterService';
import { rmCustomerService } from '../../services/rmCustomerService';
import { formatIndianAmount, getRawAmount, parseAmountToNumber } from '../../../../../Core/src/utils/amountHelper';
import { getCurrentRMContext } from '../../utils/rmContext';
import { ROUTES } from '../../config/routeConfig';
import './AddCustomer.css';

export default function AddCustomer() {
  const navigate = useNavigate();

  // RM Identity Resolution
  const rmContext = getCurrentRMContext();
  const rmId = rmContext.rmId ? Number(rmContext.rmId) : null;

  // Master Data State
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [loanPurposes, setLoanPurposes] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [mastersError, setMastersError] = useState(null);

  // Document Mapping & Upload State
  const [documentMappings, setDocumentMappings] = useState([]);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [mappingError, setMappingError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [modalImage, setModalImage] = useState(null);

  // Partial submission recovery state (to prevent duplicate customer on upload retry)
  const [createdRmCustomerId, setCreatedRmCustomerId] = useState(null);
  const [uploadedDocTypeIds, setUploadedDocTypeIds] = useState(new Set());

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    employmentTypeId: '',
    loanPurposeId: '',
    expectedAmount: '',
    remarks: '',
  });

  // Validation & UI Feedback State
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalBanner, setGlobalBanner] = useState(null); // { type: 'error' | 'info' | 'warning' | 'success', message: string }
  const [submitting, setSubmitting] = useState(false);

  // Fetch Master Data on Mount
  useEffect(() => {
    let isMounted = true;

    const fetchMasters = async () => {
      setLoadingMasters(true);
      setMastersError(null);

      const extractArray = (res) => {
        if (Array.isArray(res)) return res;
        if (res && typeof res === 'object') {
          if (Array.isArray(res.data)) return res.data;
          if (Array.isArray(res.items)) return res.items;
          if (Array.isArray(res.result)) return res.result;
          if (Array.isArray(res.list)) return res.list;
          for (const key of Object.keys(res)) {
            if (Array.isArray(res[key])) return res[key];
          }
        }
        return [];
      };

      try {
        const [typesRes, purposesRes, docTypesRes] = await Promise.all([
          masterService.getEmploymentTypes(),
          masterService.getLoanPurposes(),
          masterService.getDocumentTypes(),
        ]);

        if (isMounted) {
          const typesArr = extractArray(typesRes);
          setEmploymentTypes(typesArr.filter((t) => t.isActive !== false));

          const purposesArr = extractArray(purposesRes);
          setLoanPurposes(purposesArr.filter((p) => p.isActive !== false));

          const docTypesArr = extractArray(docTypesRes);
          setDocumentTypes(docTypesArr.filter((d) => d.isActive !== false));
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load master data for RM Add Customer:', err);
          setMastersError('Failed to load Employment Types or Loan Purposes. Please refresh.');
        }
      } finally {
        if (isMounted) {
          setLoadingMasters(false);
        }
      }
    };

    fetchMasters();

    return () => {
      isMounted = false;
    };
  }, []);

  // When Employment Type Changes -> Load Document Mappings dynamically
  useEffect(() => {
    if (!formData.employmentTypeId) {
      setDocumentMappings([]);
      setSelectedFiles({});
      setPreviews({});
      setMappingError(null);
      return;
    }

    let isMounted = true;

    const loadMapping = async () => {
      setLoadingMapping(true);
      setMappingError(null);

      const extractArray = (data) => {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.data)) return data.data;
          if (Array.isArray(data.items)) return data.items;
          if (Array.isArray(data.result)) return data.result;
          if (Array.isArray(data.list)) return data.list;
          for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) return data[key];
          }
        }
        return [];
      };

      try {
        const res = await masterService.getEmploymentTypeDocumentMapping(formData.employmentTypeId);
        const allMappings = extractArray(res);

        // Resolve required documents based on active mapping AND active document type
        const resolvedMappings = allMappings.reduce((acc, mapping) => {
          if (mapping.isActive === true) {
            const doc = documentTypes.find(
              (d) => Number(d.documentTypeId || d.id) === Number(mapping.documentTypeId)
            );

            if (doc && doc.isActive === true) {
              acc.push({
                ...mapping,
                documentTypeName: doc.documentTypeName || doc.name || mapping.documentTypeName,
                documentTypeCode: doc.documentTypeCode || doc.code,
              });
            }
          }
          return acc;
        }, []);

        if (isMounted) {
          setDocumentMappings(resolvedMappings);
          setSelectedFiles({});
          setPreviews({});
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load document mapping for RM Add Customer:', err);
          setMappingError('Unable to load required documents.');
          setDocumentMappings([]);
        }
      } finally {
        if (isMounted) {
          setLoadingMapping(false);
        }
      }
    };

    if (documentTypes.length > 0) {
      loadMapping();
    }

    return () => {
      isMounted = false;
    };
  }, [formData.employmentTypeId, documentTypes]);

  // Manage Preview Object URLs
  useEffect(() => {
    const newPreviews = {};

    Object.keys(selectedFiles).forEach((docTypeId) => {
      const fileData = selectedFiles[docTypeId];
      if (!fileData) return;

      if (Array.isArray(fileData)) {
        newPreviews[docTypeId] = fileData.map((f) => {
          if (f.type && f.type.startsWith('image/')) return URL.createObjectURL(f);
          return null;
        });
      } else {
        if (fileData.type && fileData.type.startsWith('image/')) {
          newPreviews[docTypeId] = URL.createObjectURL(fileData);
        }
      }
    });

    setPreviews(newPreviews);

    return () => {
      Object.values(newPreviews).forEach((val) => {
        if (Array.isArray(val)) {
          val.forEach((url) => url && URL.revokeObjectURL(url));
        } else if (val) {
          URL.revokeObjectURL(val);
        }
      });
    };
  }, [selectedFiles]);

  const validateFile = (file) => {
    const allowedExtensions = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    if (!allowedExtensions.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      setGlobalBanner({
        type: 'error',
        message: `Invalid file type for ${file.name}. Only PDF, JPG, JPEG and PNG files are allowed.`,
      });
      return false;
    }
    if (file.size > maxSize) {
      setGlobalBanner({
        type: 'error',
        message: `File size must not exceed 10 MB for ${file.name}.`,
      });
      return false;
    }
    return true;
  };

  const handleFileChange = (e, documentTypeId, isMultiple = false) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (isMultiple) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(validateFile);
      if (validFiles.length > 0) {
        setSelectedFiles((prev) => ({
          ...prev,
          [documentTypeId]: [...(prev[documentTypeId] || []), ...validFiles],
        }));
      }
    } else {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFiles((prev) => ({
          ...prev,
          [documentTypeId]: file,
        }));
      }
    }
    e.target.value = ''; // reset file input
  };

  const handleRemoveFile = (documentTypeId, index = null) => {
    setSelectedFiles((prev) => {
      const newFiles = { ...prev };
      if (index !== null && Array.isArray(newFiles[documentTypeId])) {
        newFiles[documentTypeId] = newFiles[documentTypeId].filter((_, i) => i !== index);
        if (newFiles[documentTypeId].length === 0) {
          delete newFiles[documentTypeId];
        }
      } else {
        delete newFiles[documentTypeId];
      }
      return newFiles;
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('image') || n.includes('photo')) return User;
    if (n.includes('pan') || n.includes('aadhaar') || n.includes('id')) return IdCard;
    if (n.includes('bank') || n.includes('passbook')) return Landmark;
    return FileText;
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    if (name === 'mobileNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'fullName') {
      value = value.replace(/[^a-zA-Z\s]/g, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
    } else if (name === 'expectedAmount') {
      value = formatIndianAmount(value, true, 2);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (globalBanner) {
      setGlobalBanner(null);
    }
  };

  const handleSelectChange = (name, valueOrEvent) => {
    let value = valueOrEvent;
    if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.target !== undefined) {
      value = valueOrEvent.target.value;
    }
    const finalValue = value !== null && value !== undefined ? String(value) : '';
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (globalBanner) {
      setGlobalBanner(null);
    }
  };

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Full Name
    const name = formData.fullName.trim();
    if (!name) {
      errors.fullName = 'Full Name is required.';
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
      errors.fullName = 'Full Name can only contain letters and spaces.';
      isValid = false;
    }

    // Mobile Number
    const mobile = formData.mobileNumber.trim();
    if (!mobile) {
      errors.mobileNumber = 'Mobile Number is required.';
      isValid = false;
    } else if (mobile.length !== 10 || !/^[6-9][0-9]{9}$/.test(mobile)) {
      errors.mobileNumber = 'Please enter a valid 10-digit mobile number starting with 6-9.';
      isValid = false;
    }

    // Email (Optional)
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address.';
        isValid = false;
      }
    }

    // Employment Type
    if (!formData.employmentTypeId) {
      errors.employmentTypeId = 'Employment Type is required.';
      isValid = false;
    }

    // Loan Purpose
    if (!formData.loanPurposeId) {
      errors.loanPurposeId = 'Loan Purpose is required.';
      isValid = false;
    }

    // Expected Loan Amount
    const rawExpectedAmount = getRawAmount(formData.expectedAmount, true, 2);
    if (!rawExpectedAmount) {
      errors.expectedAmount = 'Expected Loan Amount is required.';
      isValid = false;
    } else {
      const amt = Number(rawExpectedAmount);
      if (isNaN(amt) || amt <= 0) {
        errors.expectedAmount = 'Expected Loan Amount must be greater than 0.';
        isValid = false;
      }
    }

    // Remarks
    if (!formData.remarks.trim()) {
      errors.remarks = 'Remarks are required.';
      isValid = false;
    }

    // Mandatory Documents Validation
    for (const mapping of documentMappings) {
      if (mapping.isMandatory) {
        const files = selectedFiles[mapping.documentTypeId];
        if (!files || (Array.isArray(files) && files.length === 0)) {
          setGlobalBanner({
            type: 'error',
            message: `Please upload the required document: ${mapping.documentTypeName || 'Document'}.`,
          });
          isValid = false;
          break;
        }
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalBanner(null);

    if (!rmId) {
      setGlobalBanner({
        type: 'error',
        message: 'No active Relationship Manager session detected. Please sign in again.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const isValid = validateForm();
    if (!isValid) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create or reuse existing RM customer record
      let targetCustomerId = createdRmCustomerId;

      if (!targetCustomerId) {
        const customerPayload = {
          rmId: Number(rmId),
          fullName: formData.fullName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          email: formData.email && formData.email.trim() !== '' ? formData.email.trim() : null,
          employmentTypeId: Number(formData.employmentTypeId),
          loanPurposeId: Number(formData.loanPurposeId),
          expectedLoanAmount: parseAmountToNumber(formData.expectedAmount),
          remarks: formData.remarks.trim(),
          status: 0,
          isActive: true,
          createdBy: Number(rmId),
        };

        const createRes = await rmCustomerService.createCustomer(customerPayload);
        
        targetCustomerId =
          createRes?.rmCustomerId ||
          createRes?.rMCustomerId ||
          createRes?.id ||
          createRes?.data?.rmCustomerId ||
          createRes?.data?.rMCustomerId ||
          createRes?.data?.id;

        if (!targetCustomerId) {
          throw new Error('Customer was created, but no Customer ID was returned by the server.');
        }

        setCreatedRmCustomerId(targetCustomerId);
      }

      // Step 2: Upload selected documents
      const uploadTasks = [];
      const updatedUploadedDocTypeIds = new Set(uploadedDocTypeIds);
      const failedUploads = [];

      for (const docTypeId of Object.keys(selectedFiles)) {
        if (updatedUploadedDocTypeIds.has(docTypeId)) {
          continue; // Already successfully uploaded
        }

        const fileData = selectedFiles[docTypeId];
        if (!fileData) continue;

        const filesList = Array.isArray(fileData) ? fileData : [fileData];

        for (const file of filesList) {
          if (!file) continue;

          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('rmCustomerId', String(targetCustomerId));
          uploadFormData.append('documentTypeId', String(docTypeId));
          uploadFormData.append('createdBy', String(rmId));
          uploadFormData.append('remarks', '');
          uploadFormData.append('isActive', 'true');

          uploadTasks.push({
            docTypeId,
            fileName: file.name,
            promise: rmCustomerService.uploadDocument(uploadFormData),
          });
        }
      }

      if (uploadTasks.length > 0) {
        const uploadResults = await Promise.allSettled(uploadTasks.map((t) => t.promise));

        uploadResults.forEach((result, idx) => {
          const task = uploadTasks[idx];
          if (result.status === 'fulfilled') {
            updatedUploadedDocTypeIds.add(task.docTypeId);
          } else {
            console.error(`Failed to upload ${task.fileName}:`, result.reason);
            const reasonMsg = result.reason?.response?.data?.message || result.reason?.message || 'Upload error';
            failedUploads.push(`${task.fileName} (${reasonMsg})`);
          }
        });

        setUploadedDocTypeIds(new Set(updatedUploadedDocTypeIds));
      }

      if (failedUploads.length > 0) {
        setGlobalBanner({
          type: 'warning',
          message: `Customer saved (ID: ${targetCustomerId}), but some document(s) failed: ${failedUploads.join(', ')}. Please retry upload.`,
        });
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Step 3: Success! Navigate to Submission History
      setSubmitting(false);
      navigate(ROUTES.CUSTOMER_SUBMISSION_HISTORY);
    } catch (err) {
      console.error('Error in RM Add Customer submission:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'An error occurred while creating the customer application. Please try again.';
      setGlobalBanner({
        type: 'error',
        message: errMsg,
      });
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancel = () => {
    navigate(ROUTES.CUSTOMER_SUBMISSION_HISTORY);
  };

  // Dropdown Options
  const employmentTypeOptions = employmentTypes.map((type) => ({
    value: String(type.employmentTypeId || type.id),
    label: type.employmentTypeName || type.name || 'Employment Type',
  }));

  const loanPurposeOptions = loanPurposes.map((purpose) => ({
    value: String(purpose.loanPurposeId || purpose.id),
    label: purpose.productName || purpose.purposeName || purpose.name || 'Loan Purpose',
  }));

  const employmentPlaceholder = loadingMasters
    ? 'Loading employment types...'
    : mastersError
    ? 'Unable to load employment types. Please try again.'
    : employmentTypes.length === 0
    ? 'No employment types available'
    : 'Select employment type';

  const loanPurposePlaceholder = loadingMasters
    ? 'Loading loan purposes...'
    : mastersError
    ? 'Unable to load loan purposes. Please try again.'
    : loanPurposes.length === 0
    ? 'No loan purposes available'
    : 'Select purpose';

  return (
    <div className="add-customer">
      {/* Session Identity Notice if RM ID is missing */}
      {!rmId && (
        <div className="add-customer-warning-banner">
          <AlertCircle size={18} />
          <span>No active Relationship Manager identity detected in session. Please sign in again.</span>
        </div>
      )}

      {/* Masters Load Error */}
      {mastersError && (
        <div className="add-customer-error-banner">
          <AlertCircle size={18} />
          <span>{mastersError}</span>
        </div>
      )}

      {/* Global Status Banner */}
      {globalBanner && (
        <div className={`add-customer-${globalBanner.type}-banner`}>
          {globalBanner.type === 'info' && <Info size={18} />}
          {globalBanner.type === 'error' && <AlertCircle size={18} />}
          {globalBanner.type === 'warning' && <AlertCircle size={18} />}
          {globalBanner.type === 'success' && <CheckCircle2 size={18} />}
          <span>{globalBanner.message}</span>
        </div>
      )}

      <form className="add-customer-card" onSubmit={handleSubmit} noValidate>
        {/* Section 1: Basic Information */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon-badge">
              <User size={15} strokeWidth={2} />
            </div>
            <h3 className="form-section-title">Basic Information</h3>
          </div>

          <div className="form-grid-3">
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name<span className="required-star">*</span>
              </label>
              <div className="compact-input-wrapper">
                <span className="compact-input-icon">
                  <User size={16} strokeWidth={1.8} />
                </span>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  className={`form-input compact-input--with-icon ${fieldErrors.fullName ? 'is-invalid' : ''}`}
                  placeholder="Enter full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={submitting || Boolean(createdRmCustomerId)}
                  required
                />
              </div>
              {fieldErrors.fullName && <div className="form-field-error">{fieldErrors.fullName}</div>}
            </div>

            {/* Mobile Number */}
            <div className="form-group">
              <label className="form-label" htmlFor="mobileNumber">
                Mobile Number<span className="required-star">*</span>
              </label>
              <div className="compact-input-wrapper">
                <span className="compact-input-icon">
                  <Phone size={16} strokeWidth={1.8} />
                </span>
                <input
                  id="mobileNumber"
                  type="tel"
                  name="mobileNumber"
                  className={`form-input compact-input--with-icon ${fieldErrors.mobileNumber ? 'is-invalid' : ''}`}
                  placeholder="Enter 10 digit mobile number"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  maxLength={10}
                  disabled={submitting || Boolean(createdRmCustomerId)}
                  required
                />
              </div>
              {fieldErrors.mobileNumber && <div className="form-field-error">{fieldErrors.mobileNumber}</div>}
            </div>

            {/* Email (Optional) */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email (Optional)
              </label>
              <div className="compact-input-wrapper">
                <span className="compact-input-icon">
                  <Mail size={16} strokeWidth={1.8} />
                </span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className={`form-input compact-input--with-icon ${fieldErrors.email ? 'is-invalid' : ''}`}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={submitting || Boolean(createdRmCustomerId)}
                />
              </div>
              {fieldErrors.email && <div className="form-field-error">{fieldErrors.email}</div>}
            </div>
          </div>
        </div>

        <div className="compact-divider" />

        {/* Section 2: Loan Requirement */}
        <div className="form-section">
          <div className="form-section-header">
            <div className="form-section-icon-badge">
              <CreditCard size={15} strokeWidth={2} />
            </div>
            <h3 className="form-section-title">Loan Requirement</h3>
          </div>

          <div className="form-grid-3">
            {/* Employment Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="employmentTypeId">
                Employment Type<span className="required-star">*</span>
              </label>
              <Select
                id="employmentTypeId"
                name="employmentTypeId"
                value={formData.employmentTypeId}
                onChange={(val) => handleSelectChange('employmentTypeId', val)}
                options={employmentTypeOptions}
                placeholder={employmentPlaceholder}
                disabled={loadingMasters || !!mastersError || submitting || Boolean(createdRmCustomerId)}
                error={Boolean(fieldErrors.employmentTypeId)}
                icon={<Briefcase size={16} strokeWidth={1.8} />}
              />
              {fieldErrors.employmentTypeId && <div className="form-field-error">{fieldErrors.employmentTypeId}</div>}
            </div>

            {/* Loan Purpose */}
            <div className="form-group">
              <label className="form-label" htmlFor="loanPurposeId">
                Loan Purpose<span className="required-star">*</span>
              </label>
              <Select
                id="loanPurposeId"
                name="loanPurposeId"
                value={formData.loanPurposeId}
                onChange={(val) => handleSelectChange('loanPurposeId', val)}
                options={loanPurposeOptions}
                placeholder={loanPurposePlaceholder}
                disabled={loadingMasters || !!mastersError || submitting || Boolean(createdRmCustomerId)}
                error={Boolean(fieldErrors.loanPurposeId)}
                icon={<Target size={16} strokeWidth={1.8} />}
              />
              {fieldErrors.loanPurposeId && <div className="form-field-error">{fieldErrors.loanPurposeId}</div>}
            </div>

            {/* Expected Loan Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="expectedAmount">
                Expected Loan Amount (₹)<span className="required-star">*</span>
              </label>
              <div className="compact-input-wrapper">
                <span className="compact-input-icon">
                  <IndianRupee size={16} strokeWidth={1.8} />
                </span>
                <input
                  id="expectedAmount"
                  type="text"
                  inputMode="numeric"
                  name="expectedAmount"
                  className={`form-input compact-input--with-icon ${fieldErrors.expectedAmount ? 'is-invalid' : ''}`}
                  placeholder="Enter expected loan amount"
                  value={formData.expectedAmount}
                  onChange={handleInputChange}
                  disabled={submitting || Boolean(createdRmCustomerId)}
                  required
                />
              </div>
              {fieldErrors.expectedAmount && <div className="form-field-error">{fieldErrors.expectedAmount}</div>}
            </div>
          </div>

          {/* Remarks */}
          <div className="form-grid-full">
            <div className="form-group">
              <label className="form-label" htmlFor="remarks">
                Remarks <span className="required-star">*</span>
              </label>
              <textarea
                id="remarks"
                name="remarks"
                className={`form-textarea ${fieldErrors.remarks ? 'is-invalid' : ''}`}
                placeholder="Enter any remarks"
                rows={3}
                value={formData.remarks}
                onChange={handleInputChange}
                disabled={submitting || Boolean(createdRmCustomerId)}
                required
              />
              {fieldErrors.remarks && <div className="form-field-error">{fieldErrors.remarks}</div>}
            </div>
          </div>
        </div>

        {/* Section 3: Required Documents (when Employment Type is selected) */}
        {formData.employmentTypeId && (
          <>
            <div className="compact-divider" />
            <div className="form-section">
              <div className="form-section-header">
                <div className="form-section-icon-badge">
                  <FileText size={15} strokeWidth={2} />
                </div>
                <h3 className="form-section-title">
                  Required Documents {loadingMapping && <span className="section-subtitle">(Loading required documents...)</span>}
                </h3>
              </div>

              {mappingError && (
                <div className="add-customer-error-banner">
                  <AlertCircle size={18} />
                  <span>{mappingError}</span>
                </div>
              )}

              <div className="documents-grid">
                {documentMappings.length === 0 && !loadingMapping && !mappingError && (
                  <p style={{ color: '#7A9485', fontSize: '13.5px', gridColumn: '1 / -1', margin: '4px 0' }}>
                    No documents configured for this employment type.
                  </p>
                )}

                {documentMappings.map((mapping) => {
                  const docName = mapping.documentTypeName || 'Document';
                  const isMultiple = docName.toLowerCase().includes('other');
                  const files = selectedFiles[mapping.documentTypeId];
                  const hasFile = isMultiple ? files && files.length > 0 : Boolean(files);
                  const IconComponent = getDocumentIcon(docName);
                  const isUploaded = uploadedDocTypeIds.has(String(mapping.documentTypeId));

                  return (
                    <div
                      key={mapping.documentTypeId}
                      className={`document-upload-card ${hasFile ? 'has-file' : ''}`}
                    >
                      {hasFile ? (
                        isMultiple ? (
                          <div className="file-preview-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                            {files.map((file, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '4px',
                                  border: '1px solid #E2E8E5',
                                  borderRadius: '4px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <FileText size={14} color="#1A7A3C" />
                                  <div className="file-preview-details" style={{ margin: 0 }}>
                                    <span
                                      className="file-preview-name"
                                      style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                      {file.name}
                                    </span>
                                  </div>
                                </div>
                                {!isUploaded && (
                                  <button
                                    type="button"
                                    className="file-remove-btn"
                                    onClick={() => handleRemoveFile(mapping.documentTypeId, index)}
                                    style={{ padding: '2px 4px', background: 'transparent', border: 'none' }}
                                    disabled={submitting}
                                  >
                                    <Trash2 size={13} color="#EF4444" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="file-preview-box">
                            {previews[mapping.documentTypeId] ? (
                              <img
                                src={previews[mapping.documentTypeId]}
                                alt={`${docName} Preview`}
                                className="thumbnail-preview-img"
                                onClick={() => setModalImage({ src: previews[mapping.documentTypeId], title: docName })}
                              />
                            ) : (
                              <IconComponent size={18} className="document-icon-badge" />
                            )}
                            <div className="file-preview-details">
                              <span className="file-preview-name">{files.name}</span>
                              <span className="file-preview-size">({formatFileSize(files.size)})</span>
                            </div>
                            {previews[mapping.documentTypeId] && (
                              <button
                                type="button"
                                className="action-view"
                                onClick={() => setModalImage({ src: previews[mapping.documentTypeId], title: docName })}
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="document-card-top">
                          <div className="document-icon-badge">
                            <IconComponent size={16} strokeWidth={1.8} />
                          </div>
                          <div className="document-card-info">
                            <h4>
                              {docName}
                              {mapping.isMandatory && <span className="required-star">*</span>}
                            </h4>
                            <p>Upload clear image of {docName}</p>
                            <p className="document-card-subtitle">
                              {isMultiple ? 'Upload multiple files' : 'JPG, PNG or PDF (Max. 10MB)'}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="file-actions-row">
                        {!isUploaded ? (
                          <>
                            <label className={`file-upload-btn ${submitting ? 'disabled' : ''}`}>
                              <Upload size={13} strokeWidth={2} />
                              <span>
                                {hasFile
                                  ? isMultiple
                                    ? 'Add More'
                                    : 'Change'
                                  : isMultiple
                                  ? 'Choose Files'
                                  : 'Upload Document'}
                              </span>
                              <input
                                type="file"
                                multiple={isMultiple}
                                className="file-input-hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileChange(e, mapping.documentTypeId, isMultiple)}
                                disabled={submitting}
                              />
                            </label>
                            {hasFile && !isMultiple && (
                              <button
                                type="button"
                                className="file-remove-btn"
                                onClick={() => handleRemoveFile(mapping.documentTypeId)}
                                disabled={submitting}
                              >
                                <Trash2 size={13} />
                                <span>Remove</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1A7A3C', fontSize: '12px', fontWeight: 600 }}>
                            <CheckCircle2 size={14} /> Uploaded Successfully
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleCancel}
            disabled={submitting}
          >
            <X size={15} strokeWidth={2} /> Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting || !rmId}
          >
            {submitting ? (
              <>
                <RefreshCw size={15} className="animate-spin" /> Submitting...
              </>
            ) : createdRmCustomerId ? (
              <>
                Retry Document Uploads <ArrowRight size={15} strokeWidth={2} />
              </>
            ) : (
              <>
                Save & Continue to Documents <ArrowRight size={15} strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Image Preview Modal */}
      {modalImage && (
        <div className="image-modal-backdrop" onClick={() => setModalImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <span className="image-modal-title">{modalImage.title}</span>
              <button
                type="button"
                className="image-modal-close"
                onClick={() => setModalImage(null)}
              >
                <X size={18} />
              </button>
            </div>
            <img src={modalImage.src} alt={modalImage.title} className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
}
