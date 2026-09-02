import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Users, FileText, Calendar, Phone, Mail, UserCheck } from 'lucide-react';
import iconMap from '../../config/iconMap';
import InfoBar from '../../components/InfoBar/InfoBar';
import WizardProgress from '../../components/WizardProgress/WizardProgress';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import DatePicker from '../../components/DatePicker/DatePicker';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import Modal from '../../components/Modal/Modal';
import './CustomerRegistration.css';

function digitsOnly(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isValidPan(value) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(value || '').trim().toUpperCase());
}

function isValidDate(value) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed <= new Date();
}

function splitFullName(value = '') {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
  };
}

function composeFullName(person = {}) {
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
}

function getAadhaarPreviewUrl(kycPerson = {}, side, personLabel) {
  const document = kycPerson[`aadhaar${side}`];
  return document?.preview || document?.url || kycPerson[`aadhaar${side}Url`] || `https://via.placeholder.com/400x250?text=${encodeURIComponent(`${personLabel}+Aadhaar+${side}+Not+Uploaded`)}`;
}

function createEmptyPerson(overrides = {}) {
  return {
    personalInformationId: overrides.personalInformationId || null,
    relationshipWithApplicant: overrides.relationshipWithApplicant ?? '',
    title: overrides.title ?? '',
    firstName: overrides.firstName ?? '',
    middleName: overrides.middleName ?? '',
    lastName: overrides.lastName ?? '',
    fatherOrSpouseName: overrides.fatherOrSpouseName ?? '',
    mothersMaidenName: overrides.mothersMaidenName ?? '',
    dateOfBirth: overrides.dateOfBirth ?? '',
    religion: overrides.religion ?? '',
    category: overrides.category ?? '',
    gender: overrides.gender ?? '',
    maritalStatus: overrides.maritalStatus ?? '',
    mobileNo: overrides.mobileNo ?? '',
    emailId: overrides.emailId ?? '',
    panCardNo: overrides.panCardNo ?? '',
  };
}

function buildPersonalInformationState(appData) {
  const saved = appData.registration?.personalInformation || appData.registration || {};
  const savedApplicant = saved.applicant || saved.primaryApplicant || {};
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];
  const applicantNameParts = splitFullName(savedApplicant.firstName || savedApplicant.fullName || appData.customerName || '');
  const coApplicantCount = Number(appData.coApplicantsCount ?? saved.coApplicantsCount ?? 0);

  const applicant = createEmptyPerson({
    personalInformationId: savedApplicant.personalInformationId || null,
    relationshipWithApplicant: savedApplicant.relationshipWithApplicant ?? '',
    title: savedApplicant.title ?? '',
    firstName: savedApplicant.firstName ?? applicantNameParts.firstName,
    middleName: savedApplicant.middleName ?? applicantNameParts.middleName,
    lastName: savedApplicant.lastName ?? applicantNameParts.lastName,
    fatherOrSpouseName: savedApplicant.fatherOrSpouseName ?? '',
    mothersMaidenName: savedApplicant.mothersMaidenName ?? '',
    dateOfBirth: savedApplicant.dateOfBirth ?? savedApplicant.dob ?? '',
    religion: savedApplicant.religion ?? '',
    category: savedApplicant.category ?? '',
    gender: savedApplicant.gender ?? appData.gender ?? '',
    maritalStatus: savedApplicant.maritalStatus ?? '',
    mobileNo: savedApplicant.mobileNo ?? appData.mobile ?? '',
    emailId: savedApplicant.emailId ?? appData.email ?? '',
    panCardNo: savedApplicant.panCardNo ?? appData.panNumber ?? '',
  });

  const coApplicants = Array.from({ length: coApplicantCount }, (_, index) => {
    const current = savedCoApplicants[index] || {};
    return createEmptyPerson({
      personalInformationId: current.personalInformationId || null,
      relationshipWithApplicant: current.relationshipWithApplicant ?? current.relationship ?? '',
      title: current.title ?? '',
      firstName: current.firstName ?? '',
      middleName: current.middleName ?? '',
      lastName: current.lastName ?? '',
      fatherOrSpouseName: current.fatherOrSpouseName ?? '',
      mothersMaidenName: current.mothersMaidenName ?? '',
      dateOfBirth: current.dateOfBirth ?? current.dob ?? '',
      religion: current.religion ?? '',
      category: current.category ?? '',
      gender: current.gender ?? '',
      maritalStatus: current.maritalStatus ?? '',
      mobileNo: current.mobileNo ?? current.mobile ?? '',
      emailId: current.emailId ?? current.email ?? '',
      panCardNo: current.panCardNo ?? current.panNumber ?? '',
    });
  });

  return {
    applicant,
    coApplicants,
  };
}

function buildRegistrationPayload(form, baseData = {}) {
  const applicantName = composeFullName(form.applicant);
  return {
    registration: {
      personalInformation: form,
      primaryApplicant: form.applicant,
      coApplicants: form.coApplicants,
      coApplicantsCount: form.coApplicants.length,
    },
    customerName: applicantName || baseData.customerName || '',
    mobile: form.applicant.mobileNo || baseData.mobile || '',
    gender: form.applicant.gender || baseData.gender || '',
    status: baseData.status || 'Customer Registration',
  };
}

function validatePerson(person, { isCoApplicant = false } = {}) {
  const errors = {};

  if (!String(person.firstName || '').trim()) {
    errors.firstName = 'First name is required';
  }

  if (!String(person.lastName || '').trim()) {
    errors.lastName = 'Last name is required';
  }

  return errors;
}

function PersonCard({
  heading,
  person,
  onChange,
  errors,
  relationshipMode = 'readOnly',
  relationshipOptions = [],
  titleOptions = [],
  categoryOptions = [],
  genderOptions = [],
  maritalStatusOptions = [],
  religionOptions = [],
  isLoadingMasters = false,
  isCoApplicant = false
}) {
  const handleChange = (field, value) => onChange(field, value);

  return (
    <div className="cr-person-card">
      <div className="cr-person-card__header">
        <div className="cr-person-card__title">{heading}</div>
        <span className={`badge ${isCoApplicant ? 'badge--warning' : 'badge--success'}`}>
          {isCoApplicant ? 'CO-APPLICANT' : 'APPLICANT'}
        </span>
      </div>

      <div className="cr-person-card__body">
        <div className="cr-form-grid">
          <div className="cr-field">
            <label className="form-label">
              Relationship with Applicant
            </label>
            <div className="cr-input-wrapper">
              {relationshipMode === 'select' ? (
                <Select
                  error={!!errors.relationshipWithApplicant}
                  value={person.relationshipWithApplicant}
                  onChange={(val) => handleChange('relationshipWithApplicant', val)}
                  placeholder={isLoadingMasters ? "Loading..." : "Select relationship"}
                  options={relationshipOptions}
                  disabled={isLoadingMasters}
                />
              ) : (
                <div className="cr-input-readonly">
                  <User size={14} className="cr-input-icon" />
                  <span>{person.relationshipWithApplicant}</span>
                </div>
              )}
            </div>
            {errors.relationshipWithApplicant && (
              <span className="cr-field-error">{errors.relationshipWithApplicant}</span>
            )}
          </div>

          <div className="cr-field">
            <label className="form-label">Title</label>
            <div className="cr-input-wrapper">
              <Select
                error={!!errors.title}
                value={person.title}
                onChange={(val) => handleChange('title', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select title"}
                options={titleOptions}
                disabled={isLoadingMasters}
                icon={<User size={14} />}
              />
            </div>
            {errors.title && <span className="cr-field-error">{errors.title}</span>}
          </div>

          <div className="cr-field">
            <label className="form-label">
              First Name <span className="cr-required-star">*</span>
            </label>
            <div className="cr-input-wrapper">
              <User className="cr-input-icon" size={14} />
              <input
                className={`form-input cr-input cr-input--with-icon ${errors.firstName ? 'cr-input--invalid' : ''}`}
                type="text"
                value={person.firstName}
                onChange={(event) => handleChange('firstName', event.target.value)}
              />
            </div>
            {errors.firstName && <span className="cr-field-error">{errors.firstName}</span>}
          </div>

          <div className="cr-field">
            <label className="form-label">
              Middle Name <span className="cr-optional-label">(Optional)</span>
            </label>
            <div className="cr-input-wrapper">
              <User className="cr-input-icon" size={14} />
              <input
                className="form-input cr-input cr-input--with-icon"
                type="text"
                value={person.middleName}
                onChange={(event) => handleChange('middleName', event.target.value)}
              />
            </div>
          </div>

          <div className="cr-field cr-field--full">
            <label className="form-label">
              Last Name <span className="cr-required-star">*</span>
            </label>
            <div className="cr-input-wrapper">
              <User className="cr-input-icon" size={14} />
              <input
                className={`form-input cr-input cr-input--with-icon ${errors.lastName ? 'cr-input--invalid' : ''}`}
                type="text"
                value={person.lastName}
                onChange={(event) => handleChange('lastName', event.target.value)}
              />
            </div>
            {errors.lastName && <span className="cr-field-error">{errors.lastName}</span>}
          </div>

          <div className="cr-field cr-field--full">
            <label className="form-label">
              Father's / Spouse Name
            </label>
            <div className="cr-input-wrapper">
              <User className="cr-input-icon" size={14} />
              <input
                className={`form-input cr-input cr-input--with-icon ${errors.fatherOrSpouseName ? 'cr-input--invalid' : ''}`}
                type="text"
                value={person.fatherOrSpouseName}
                onChange={(event) => handleChange('fatherOrSpouseName', event.target.value)}
              />
            </div>
            {errors.fatherOrSpouseName && <span className="cr-field-error">{errors.fatherOrSpouseName}</span>}
          </div>

          <div className="cr-field cr-field--full">
            <label className="form-label">Mother's Maiden Name</label>
            <div className="cr-input-wrapper">
              <User className="cr-input-icon" size={14} />
              <input
                className="form-input cr-input cr-input--with-icon"
                type="text"
                value={person.mothersMaidenName}
                onChange={(event) => handleChange('mothersMaidenName', event.target.value)}
              />
            </div>
          </div>

          <div className="cr-field">
            <label className="form-label">
              Date of Birth
            </label>
            <div className="cr-input-wrapper">
              <DatePicker
                error={!!errors.dateOfBirth}
                value={person.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(val) => handleChange('dateOfBirth', val)}
                placeholder="DD/MM/YYYY"
              />
            </div>
            {errors.dateOfBirth && <span className="cr-field-error">{errors.dateOfBirth}</span>}
          </div>

          <div className="cr-field">
            <label className="form-label">Religion</label>
            <div className="cr-input-wrapper">
              <Select
                value={person.religion}
                onChange={(val) => handleChange('religion', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select religion"}
                options={religionOptions}
                disabled={isLoadingMasters}
                icon={<FileText size={14} />}
              />
            </div>
          </div>

          <div className="cr-field">
            <label className="form-label">Category</label>
            <div className="cr-input-wrapper">
              <Select
                value={person.category}
                onChange={(val) => handleChange('category', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select category"}
                options={categoryOptions}
                disabled={isLoadingMasters}
                icon={<FileText size={14} />}
              />
            </div>
          </div>

          <div className="cr-field">
            <label className="form-label">Gender</label>
            <div className="cr-input-wrapper">
              <Select
                error={!!errors.gender}
                value={person.gender}
                onChange={(val) => handleChange('gender', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select gender"}
                options={genderOptions}
                disabled={isLoadingMasters}
                icon={<User size={14} />}
              />
            </div>
            {errors.gender && <span className="cr-field-error">{errors.gender}</span>}
          </div>

          <div className="cr-field">
            <label className="form-label">Marital Status</label>
            <div className="cr-input-wrapper">
              <Select
                error={!!errors.maritalStatus}
                value={person.maritalStatus}
                onChange={(val) => handleChange('maritalStatus', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select marital status"}
                options={maritalStatusOptions}
                disabled={isLoadingMasters}
                icon={<UserCheck size={14} />}
              />
            </div>
            {errors.maritalStatus && <span className="cr-field-error">{errors.maritalStatus}</span>}
          </div>

          <div className="cr-field">
            <label className="form-label">
              Mobile No.
            </label>
            <div className="cr-input-wrapper">
              <Phone className="cr-input-icon" size={14} />
              <input
                className={`form-input cr-input cr-input--with-icon ${errors.mobileNo ? 'cr-input--invalid' : ''}`}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={person.mobileNo}
                onChange={(event) => handleChange('mobileNo', event.target.value)}
              />
            </div>
            {errors.mobileNo && <span className="cr-field-error">{errors.mobileNo}</span>}
          </div>

          <div className="cr-field">
            <label className="form-label">
              Email ID
            </label>
            <div className="cr-input-wrapper">
              <Mail className="cr-input-icon" size={14} />
              <input
                className={`form-input cr-input cr-input--with-icon ${errors.emailId ? 'cr-input--invalid' : ''}`}
                type="email"
                value={person.emailId}
                onChange={(event) => handleChange('emailId', event.target.value)}
              />
            </div>
            {errors.emailId && <span className="cr-field-error">{errors.emailId}</span>}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CustomerRegistration() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildPersonalInformationState(getApplication(appId)));
  const [errors, setErrors] = useState({});

  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [titleOptions, setTitleOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [genderOptions, setGenderOptions] = useState([]);
  const [maritalStatusOptions, setMaritalStatusOptions] = useState([]);
  const [relationshipOptions, setRelationshipOptions] = useState([]);
  const [religionOptions, setReligionOptions] = useState([]);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  useEffect(() => {
    let active = true;
    async function fetchCustomerDetails() {
      if (!appId) return;
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const res = await fetch(`${baseUrl}/AgentAddCustomer/${appId}`);
        if (res.ok) {
          const data = await res.json();
          const record = Array.isArray(data) ? data[0] : (data?.value ? data.value[0] : data);
          if (active && record) {
            const custName = record.fullName || record.customerName || '';
            const parts = splitFullName(custName);
            saveApplication(appId, {
              agentCustomerId: record.agentCustomerId || record.AgentCustomerId || appId,
              customerName: custName,
              mobile: record.mobileNumber || record.mobile,
              branch: record.branch,
              createdDate: record.createdAt || record.createdDate,
              agentName: record.agentName,
            });
            setForm((prev) => {
              const currentName = composeFullName(prev.applicant);
              if (!currentName || currentName === 'Anil Kumar') {
                return {
                  ...prev,
                  applicant: {
                    ...prev.applicant,
                    firstName: parts.firstName || prev.applicant.firstName,
                    middleName: parts.middleName || prev.applicant.middleName,
                    lastName: parts.lastName || prev.applicant.lastName,
                    mobileNo: record.mobileNumber || record.mobile || prev.applicant.mobileNo,
                  }
                };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.error('Error fetching customer details for CustomerRegistration:', err);
      }
    }

    fetchCustomerDetails();

    return () => {
      active = false;
    };
  }, [appId]);

  useEffect(() => {
    async function fetchMaster(endpoint, idField, nameField, setState, uniqueValues = false) {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
        const res = await fetch(`${baseUrl}/${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          if (uniqueValues) {
             const uniqueNames = [...new Set(data.map(item => item[nameField]))];
             setState(uniqueNames.map(name => ({ value: name, label: name })));
          } else {
             setState(data.map(item => ({ value: item[idField], label: item[nameField], raw: item })));
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${endpoint}:`, e);
      }
    }

    async function loadMasters() {
      setIsLoadingMasters(true);
      await Promise.allSettled([
        fetchMaster('TitleMaster', 'titleID', 'titleName', setTitleOptions),
        fetchMaster('masters/CasteMaster', 'casteId', 'casteName', setCategoryOptions),
        fetchMaster('gender', 'genderId', 'genderName', setGenderOptions),
        fetchMaster('marital-status', 'maritalStatusId', 'maritalStatusName', setMaritalStatusOptions),
        fetchMaster('RelationshipMaster', 'relationshipId', 'relationshipName', setRelationshipOptions),
        fetchMaster('masters/ReligionMaster', 'religionId', 'religionName', setReligionOptions),
      ]);
      setIsLoadingMasters(false);
    }
    loadMasters();
  }, []);

  const appData = useMemo(() => getApplication(appId), [getApplication, appId]);
  const coApplicantCount = Number(appData.coApplicantsCount || 0);
  const applicationSteps = useMemo(() => APPLICATION_WIZARD_STEPS, []);

  useEffect(() => {
    setForm(buildPersonalInformationState(appData));
    setErrors({});
  }, [appId, appData]);

  const ArrowRightIcon = iconMap['ArrowRight'];
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  const syncForm = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, {
      ...buildRegistrationPayload(nextForm, appData),
    });
  };

  const updatePersonField = (scope, field, value, index = null) => {
    if (scope === 'applicant') {
      const nextForm = {
        ...form,
        applicant: {
          ...form.applicant,
          [field]: value,
        },
      };
      syncForm(nextForm);
      setErrors((current) => {
        const next = { ...current };
        delete next[`applicant.${field}`];
        return next;
      });
      return;
    }

    const nextCoApplicants = form.coApplicants.map((person, currentIndex) => (
      currentIndex === index ? { ...person, [field]: value } : person
    ));
    const nextForm = {
      ...form,
      coApplicants: nextCoApplicants,
    };
    syncForm(nextForm);
    setErrors((current) => {
      const next = { ...current };
      delete next[`coApplicants.${index}.${field}`];
      return next;
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    const applicantErrors = validatePerson(form.applicant);
    Object.entries(applicantErrors).forEach(([field, message]) => {
      nextErrors[`applicant.${field}`] = message;
    });

    form.coApplicants.forEach((person, index) => {
      const personErrors = validatePerson(person, { isCoApplicant: true });
      Object.entries(personErrors).forEach(([field, message]) => {
        nextErrors[`coApplicants.${index}.${field}`] = message;
      });
    });

    return nextErrors;
  };

  const handleSaveAndContinue = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api';
    
    // Save to API for each person
    const allPersons = [
      { ...form.applicant, isPrimary: true },
      ...form.coApplicants.map((co, i) => ({ ...co, index: i, isPrimary: false }))
    ];

    try {
      for (const person of allPersons) {
        // Find corresponding KYC doc ID
        const kycDocId = person.isPrimary 
          ? appData.kycDocuments?.applicant?.kycDocumentId 
          : appData.kycDocuments?.coApplicants?.[person.index]?.kycDocumentId;

        if (!kycDocId) {
          console.warn('No KYC Document ID found for person, skipping API save');
          continue;
        }

        const isUpdate = !!person.personalInformationId;
        const url = isUpdate
          ? `${baseUrl}/ApplicationPersonalInformation/${person.personalInformationId}`
          : `${baseUrl}/ApplicationPersonalInformation`;

        const payload = {
          ApplicationKYCDocumentId: Number(kycDocId),
          RelationshipId: person.relationshipWithApplicant ? Number(person.relationshipWithApplicant) : 1, // Defaulting if not selected
          TitleId: person.title ? Number(person.title) : 1,
          FirstName: person.firstName || '',
          MiddleName: person.middleName || null,
          LastName: person.lastName || '',
          FatherSpouseName: person.fatherOrSpouseName || null,
          CasteId: person.category ? Number(person.category) : null,
          GenderId: person.gender ? Number(person.gender) : null,
          MaritalStatusId: person.maritalStatus ? Number(person.maritalStatus) : null,
          MobileNumber: person.mobileNo || null,
          EmailId: person.emailId || null,
          ReligionId: person.religion ? Number(person.religion) : null,
          DateOfBirth: person.dateOfBirth ? new Date(person.dateOfBirth).toISOString() : null,
          MothersMaidenName: person.mothersMaidenName || null,
          CreatedBy: 1
        };
        
        if (isUpdate) {
          payload.PersonalInformationId = Number(person.personalInformationId);
        }

        console.log(`Saving PersonalInfo [${isUpdate ? 'PUT' : 'POST'}]:`, payload);

        const response = await fetch(url, {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to save: ${response.statusText}`);
        }

        let savedData = null;
        if (response.status !== 204) {
          const text = await response.text();
          if (text) { try { savedData = JSON.parse(text); } catch (e) { /* ignore */ } }
        }
        
        const savedId = savedData?.personalInformationId || savedData?.PersonalInformationId;
        if (savedId) {
          person.personalInformationId = savedId;
        }
      }

      // Sync updated IDs back to form state
      const finalForm = {
        ...form,
        applicant: { ...form.applicant, personalInformationId: allPersons[0].personalInformationId },
        coApplicants: form.coApplicants.map((co, i) => ({
          ...co,
          personalInformationId: allPersons[i + 1]?.personalInformationId || co.personalInformationId
        }))
      };

      saveApplication(appId, {
        ...buildRegistrationPayload(finalForm, appData),
      });

      navigate(ROUTES.ADDRESS_DETAILS.replace(':applicationId', appId));
    } catch (err) {
      console.error('Error saving Personal Information:', err);
      alert('Network error while saving personal information.');
    }
  };

  const handleBack = () => {
    navigate(ROUTES.KYC_DOCUMENTS.replace(':applicationId', appId));
  };

  const applicant = form.applicant;
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [fullViewImage, setFullViewImage] = useState(null);
  const kycDocuments = appData.sections?.kycDocuments || appData.kycDocuments || {};
  const aadhaarDocumentPeople = [
    {
      label: 'Applicant',
      kyc: kycDocuments.applicant || {},
    },
    ...form.coApplicants.map((_, index) => ({
      label: `Co-Applicant ${index + 1}`,
      kyc: kycDocuments.coApplicants?.[index] || {},
    })),
  ];

  return (
    <div className="page-container cr-page-root compact-mode">
      <header className="ad-premium-header">
        <div className="ad-premium-header-top">
          <div className="ad-title-group">
            <div className="ad-icon-wrapper">
              {iconMap['FileText'] && (() => { const FileText = iconMap['FileText']; return <FileText size={20} strokeWidth={2.5} />; })()}
            </div>
            <div>
              <div className="ad-title-row">
                <h1 className="ad-page-title">Step 3: Personal Information</h1>
                <span className="ad-step-badge">Step 3 of 12</span>
              </div>
              <p className="ad-page-description">Capture the applicant details required for the PDF Section 2 and continue to Address Details.</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
            onClick={handleBack}
          >
            Back to KYC Documents
          </Button>
        </div>

        <div className="ad-premium-header-bottom">
          <div className="ad-meta-item">
            <span className="ad-meta-label">Applicant</span>
            <div className="ad-meta-value-group highlight">
              {iconMap['User'] && (() => { const User = iconMap['User']; return <User size={14} />; })()}
              <span className="ad-meta-value">{appData.customerName || appData.fullName || composeFullName(form.applicant) || 'Applicant'}</span>
            </div>
          </div>
          <div className="ad-meta-divider" />
          <div className="ad-meta-item">
            <span className="ad-meta-label">App ID</span>
            <div className="ad-meta-value-group">
              {iconMap['FileText'] && (() => { const FileText = iconMap['FileText']; return <FileText size={14} />; })()}
              <span className="ad-meta-value">{appData.applicationNumber || appId}</span>
            </div>
          </div>
          <div className="ad-meta-divider" />
          <div className="ad-meta-item">
            <span className="ad-meta-label">Branch</span>
            <div className="ad-meta-value-group">
              {iconMap['MapPin'] && (() => { const MapPin = iconMap['MapPin']; return <MapPin size={14} />; })()}
              <span className="ad-meta-value">{appData.branch || 'Pending Branch'}</span>
            </div>
          </div>
          <div className="ad-meta-divider" />
            <div className="ad-meta-item">
              <span className="ad-meta-label">Submitted</span>
              <div className="ad-meta-value-group">
                {iconMap['Calendar'] && (() => { const Calendar = iconMap['Calendar']; return <Calendar size={14} />; })()}
                <span className="ad-meta-value">{`${appData.createdDate || 'Today'}, 10:25 AM`}</span>
              </div>
            </div>
            <div className="ad-meta-divider" />
            <div className="ad-meta-item" style={{ marginLeft: 'auto', paddingLeft: '16px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDocsModal(true)}
              >
                View Aadhaar
              </Button>
            </div>
        </div>
      </header>

      <div className="panel cr-form-card">
        <div className="cr-form-body">
          <PersonCard
            heading="Applicant Information"
            person={applicant}
            onChange={(field, value) => updatePersonField('applicant', field, value)}
            errors={Object.fromEntries(
              Object.entries(errors)
                .filter(([key]) => key.startsWith('applicant.'))
                .map(([key, value]) => [key.split('.').slice(1).join('.'), value]),
            )}
            relationshipMode="select"
            titleOptions={titleOptions}
            categoryOptions={categoryOptions}
            genderOptions={genderOptions}
            maritalStatusOptions={maritalStatusOptions}
            relationshipOptions={relationshipOptions}
            religionOptions={religionOptions}
            isLoadingMasters={isLoadingMasters}
            isCoApplicant={false}
          />

          {coApplicantCount > 0 && (
            <div className="cr-section-divider">
              <div className="cr-section-divider__label">Co-Applicant Information</div>
              <div className="cr-section-divider__note">
                {coApplicantCount === 1 ? '1 co-applicant is linked to this application.' : `${coApplicantCount} co-applicants are linked to this application.`}
              </div>
            </div>
          )}

          {form.coApplicants.map((person, index) => (
            <PersonCard
              key={`co-${index}`}
              heading={`Co-Applicant ${index + 1}`}
              person={person}
              onChange={(field, value) => updatePersonField('coApplicants', field, value, index)}
              errors={Object.fromEntries(
                Object.entries(errors)
                  .filter(([key]) => key.startsWith(`coApplicants.${index}.`))
                  .map(([key, value]) => [key.split('.').slice(2).join('.'), value]),
              )}
              relationshipMode="select"
              titleOptions={titleOptions}
              categoryOptions={categoryOptions}
              genderOptions={genderOptions}
              maritalStatusOptions={maritalStatusOptions}
              relationshipOptions={relationshipOptions}
              religionOptions={religionOptions}
              isLoadingMasters={isLoadingMasters}
              isCoApplicant
            />
          ))}
        </div>

        <div className="cr-form-footer">
          <div className="cr-footer-left">
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
              onClick={handleBack}
              style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' }}
            >
              Back
            </Button>
          </div>

          <div className="cr-footer-actions">
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRightIcon ? <ArrowRightIcon size={14} /> : null}
              iconPosition="right"
              onClick={handleSaveAndContinue}
            >
              Save & Continue
            </Button>
          </div>
        </div>
      </div>

      <Modal 
        show={showDocsModal} 
        onHide={() => setShowDocsModal(false)} 
        title="Aadhaar Document View"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '0 8px' }}>
          {aadhaarDocumentPeople.map((person) => {
            const frontUrl = getAadhaarPreviewUrl(person.kyc, 'Front', person.label);
            const backUrl = getAadhaarPreviewUrl(person.kyc, 'Back', person.label);

            return (
              <section key={person.label}>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1e293b' }}>{person.label}</h4>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 8px', fontSize: '12px', color: '#475569' }}>Aadhaar Front</h5>
                    <div
                      style={{ width: '100%', height: '180px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                      onClick={() => setFullViewImage(frontUrl)}
                      title="Click to view full size"
                    >
                      <img src={frontUrl} alt={`${person.label} Aadhaar Front`} style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 8px', fontSize: '12px', color: '#475569' }}>Aadhaar Back</h5>
                    <div
                      style={{ width: '100%', height: '180px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                      onClick={() => setFullViewImage(backUrl)}
                      title="Click to view full size"
                    >
                      <img src={backUrl} alt={`${person.label} Aadhaar Back`} style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </Modal>

      <Modal
        show={!!fullViewImage}
        onHide={() => setFullViewImage(null)}
        title="Full View"
        size="lg"
      >
        <div style={{ width: '100%', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          {fullViewImage && <img src={fullViewImage} alt="Full View" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
        </div>
      </Modal>
    </div>
  );
}
