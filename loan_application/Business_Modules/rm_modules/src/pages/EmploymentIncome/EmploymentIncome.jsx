import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Briefcase, UserCog, GraduationCap, Factory, Clock, IndianRupee } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import Select from '../../components/Select/Select';
import Modal from '../../components/Modal/Modal';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import ErrorPopup from '../../components/ErrorPopup/ErrorPopup';
import {
  buildSectionUpdate,
  createArray,
  getApplicantCount,
  getSectionState,
  resolveLatestApplicantSalarySlip,
  resolveLatestCoApplicantSalarySlip,
} from '../applicationWizard/flowUtils';
import { formatIndianAmount, getRawAmount, parseAmountToNumber } from '../../../../../Core/src/utils/amountHelper';
import { resolveDocumentTypeId } from '../../../../../Core/src/utils/documentTypeHelper';

function buildEmploymentState(appData) {
  const saved = getSectionState(appData, 'employmentIncome', {});
  const count = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  const createPerson = (source = {}) => ({
    employmentIncomeDetailsId: source.employmentIncomeDetailsId || null,
    employerBusinessName: source.employerBusinessName || '',
    designationNatureOfBusiness: source.designationNatureOfBusiness || '',
    employmentNature: source.employmentNature || '',
    qualification: source.qualification || '',
    industryType: source.industryType ?? source.industryTypeId ?? '',
    totalExperienceYears: source.totalExperienceYears || '',
    grossMonthlyIncome: source.grossMonthlyIncome || '',
    otherIncomeMonthly: source.otherIncomeMonthly || '',
    netMonthlyIncome: source.netMonthlyIncome || '',
    grossAnnualIncome: source.grossAnnualIncome || '',
  });

  const savedApplicant = saved.applicant || {};
  const hasSavedApplicantNature =
    savedApplicant.employmentNature !== undefined &&
    savedApplicant.employmentNature !== null &&
    String(savedApplicant.employmentNature).trim() !== '';

  const fallbackApplicantNature =
    appData?.customer?.employmentTypeId ??
    appData?.customer?.EmploymentTypeId ??
    appData?.raw?.customer?.employmentTypeId ??
    appData?.raw?.customer?.EmploymentTypeId ??
    appData?.employmentTypeId ??
    appData?.EmploymentTypeId ??
    '';

  const applicantEmploymentNature = hasSavedApplicantNature
    ? savedApplicant.employmentNature
    : (fallbackApplicantNature !== '' && fallbackApplicantNature !== null && fallbackApplicantNature !== undefined
        ? fallbackApplicantNature
        : '');

  return {
    applicant: {
      ...createPerson(savedApplicant),
      employmentNature: applicantEmploymentNature,
    },
    coApplicants: createArray(count, (index) => createPerson(savedCoApplicants[index])),
  };
}

function validateEmployment(person = {}) {
  const errors = {};

  if (!String(person.employerBusinessName || '').trim()) {
    errors.employerBusinessName = 'Employer / Business name is required';
  }

  if (!String(person.designationNatureOfBusiness || '').trim()) {
    errors.designationNatureOfBusiness = 'Designation / Nature of business is required';
  }

  if (!person.employmentNature || String(person.employmentNature).trim() === '') {
    errors.employmentNature = 'Employment nature is required';
  }

  if (!person.qualification || String(person.qualification).trim() === '') {
    errors.qualification = 'Qualification is required';
  }

  if (!person.industryType || String(person.industryType).trim() === '') {
    errors.industryType = 'Industry type is required';
  }

  if (person.totalExperienceYears === '' || person.totalExperienceYears === null || person.totalExperienceYears === undefined || isNaN(Number(person.totalExperienceYears)) || Number(person.totalExperienceYears) < 0) {
    errors.totalExperienceYears = 'Total experience is required';
  }

  const grossMonthly = parseAmountToNumber(person.grossMonthlyIncome);
  if (person.grossMonthlyIncome === '' || person.grossMonthlyIncome === null || person.grossMonthlyIncome === undefined || isNaN(grossMonthly) || grossMonthly <= 0) {
    errors.grossMonthlyIncome = 'Gross monthly income is required';
  }

  return errors;
}

function EmploymentCard({ 
  title, 
  person, 
  onChange, 
  errors = {},
  qualificationOptions = [],
  employmentNatureOptions = [],
  industryTypeOptions = [],
  isLoadingMasters = false
}) {
  const matchedIndustryOption = industryTypeOptions.find(
    (opt) =>
      opt.value === person.industryType ||
      (person.industryType !== '' &&
        person.industryType !== null &&
        person.industryType !== undefined &&
        String(opt.value) === String(person.industryType)) ||
      (typeof person.industryType === 'string' &&
        person.industryType.trim() !== '' &&
        String(opt.label).toLowerCase() === person.industryType.trim().toLowerCase())
  );
  const currentIndustryValue = matchedIndustryOption ? matchedIndustryOption.value : person.industryType;

  const grossMonthly = parseAmountToNumber(person.grossMonthlyIncome);
  const otherMonthly = parseAmountToNumber(person.otherIncomeMonthly);
  const previewNetMonthly = grossMonthly + otherMonthly;
  const previewGrossAnnual = previewNetMonthly * 12;

  const displayNetMonthly =
    previewNetMonthly > 0
      ? formatIndianAmount(previewNetMonthly)
      : (person.netMonthlyIncome ? formatIndianAmount(person.netMonthlyIncome) : '');

  const displayGrossAnnual =
    previewGrossAnnual > 0
      ? formatIndianAmount(previewGrossAnnual)
      : (person.grossAnnualIncome ? formatIndianAmount(person.grossAnnualIncome) : '');

  return (
    <div className="aw-mini-card">
      <div className="aw-mini-card__header">
        <div>
          <div className="aw-mini-card__title">{title}</div>
          <div className="aw-mini-card__subtitle">Employment and income details as per PDF Section 5</div>
        </div>
      </div>
      <div className="aw-mini-card__body">
        <div className="aw-grid">
          <div className="aw-field">
            <label className="form-label">Employer / Business Name</label>
            <div className="aw-input-wrapper">
              <Building2 className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.employerBusinessName ? 'aw-input--invalid' : ''}`}
                value={person.employerBusinessName}
                onChange={(e) => onChange('employerBusinessName', e.target.value)}
              />
            </div>
            {errors.employerBusinessName && <span className="aw-field-error">{errors.employerBusinessName}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Designation / Nature of Business</label>
            <div className="aw-input-wrapper">
              <Briefcase className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.designationNatureOfBusiness ? 'aw-input--invalid' : ''}`}
                value={person.designationNatureOfBusiness}
                onChange={(e) => onChange('designationNatureOfBusiness', e.target.value)}
              />
            </div>
            {errors.designationNatureOfBusiness && <span className="aw-field-error">{errors.designationNatureOfBusiness}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Employment Nature</label>
            <div className="aw-input-wrapper">
              <Select
                error={!!errors.employmentNature}
                value={person.employmentNature}
                onChange={(val) => onChange('employmentNature', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select type"}
                options={employmentNatureOptions}
                disabled={isLoadingMasters}
              />
            </div>
            {errors.employmentNature && <span className="aw-field-error">{errors.employmentNature}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Qualification</label>
            <div className="aw-input-wrapper">
              <Select
                error={!!errors.qualification}
                value={person.qualification}
                onChange={(val) => onChange('qualification', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select qualification"}
                options={qualificationOptions}
                disabled={isLoadingMasters}
                icon={<GraduationCap size={14} />}
              />
            </div>
            {errors.qualification && <span className="aw-field-error">{errors.qualification}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Industry Type</label>
            <div className="aw-input-wrapper">
              <Select
                error={!!errors.industryType}
                value={currentIndustryValue}
                onChange={(val) => onChange('industryType', val)}
                placeholder={isLoadingMasters ? "Loading..." : "Select Industry Type"}
                options={industryTypeOptions}
                disabled={isLoadingMasters}
                icon={<Factory size={14} />}
              />
            </div>
            {errors.industryType && <span className="aw-field-error">{errors.industryType}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Total Experience (Years)</label>
            <div className="aw-input-wrapper">
              <Clock className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.totalExperienceYears ? 'aw-input--invalid' : ''}`}
                type="number"
                min="0"
                step="0.1"
                value={person.totalExperienceYears}
                onChange={(e) => onChange('totalExperienceYears', e.target.value)}
              />
            </div>
            {errors.totalExperienceYears && <span className="aw-field-error">{errors.totalExperienceYears}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Gross Monthly Income (Rs.)</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.grossMonthlyIncome ? 'aw-input--invalid' : ''}`}
                type="text"
                inputMode="numeric"
                value={formatIndianAmount(person.grossMonthlyIncome)}
                onChange={(e) => onChange('grossMonthlyIncome', e.target.value)}
              />
            </div>
            {errors.grossMonthlyIncome && <span className="aw-field-error">{errors.grossMonthlyIncome}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Other Income Monthly (Rs.)</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input
                className="form-input aw-input aw-input--with-icon"
                type="text"
                inputMode="numeric"
                value={formatIndianAmount(person.otherIncomeMonthly)}
                onChange={(e) => onChange('otherIncomeMonthly', e.target.value)}
              />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Net Monthly Income (Rs.)</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input
                className="form-input aw-input aw-input--with-icon"
                type="text"
                readOnly
                tabIndex={-1}
                value={displayNetMonthly}
                placeholder="Auto-calculated"
                style={{ backgroundColor: '#f8fafc', cursor: 'default' }}
              />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Gross Annual Income (Rs.)</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input
                className="form-input aw-input aw-input--with-icon"
                type="text"
                readOnly
                tabIndex={-1}
                value={displayGrossAnnual}
                placeholder="Auto-calculated"
                style={{ backgroundColor: '#f8fafc', cursor: 'default' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmploymentIncome() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const appId = applicationId;
  const { getApplication, ensureApplication, saveApplication } = useApplicationDraftStore();
  const [form, setForm] = useState(() => buildEmploymentState(getApplication(appId)));
  const [errors, setErrors] = useState({});
  const [errorPopup, setErrorPopup] = useState(null);

  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [qualificationOptions, setQualificationOptions] = useState([]);
  const [employmentNatureOptions, setEmploymentNatureOptions] = useState([]);
  const [industryTypeOptions, setIndustryTypeOptions] = useState([]);
  const [documentTypeOptions, setDocumentTypeOptions] = useState([]);

  const [showDocsModal, setShowDocsModal] = useState(false);
  const [fullViewDoc, setFullViewDoc] = useState(null);
  const [salarySlipPreviews, setSalarySlipPreviews] = useState({});
  const blobUrlsRef = useRef([]);

  useEffect(() => {
    async function fetchMaster(endpoint, idField, nameField, setStateFunc) {
      try {
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api').replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/${endpoint}`);
        if (res.ok) {
          const raw = await res.json();
          const data = Array.isArray(raw) ? raw : (raw?.value ?? raw?.items ?? raw?.data ?? []);
          const activeRecords = data.filter((item) => item.isActive !== false);
          setStateFunc(
            activeRecords.map((item) => ({
              value: item[idField],
              label: item[nameField] || item.industryTypeName || item.industryType || String(item[idField]),
              raw: item,
            }))
          );
        }
      } catch (e) {
        console.error(`Failed to fetch ${endpoint}:`, e);
      }
    }

    async function loadMasters() {
      setIsLoadingMasters(true);
      await Promise.allSettled([
        fetchMaster('EducationMaster', 'educationId', 'educationName', setQualificationOptions),
        fetchMaster('EmploymentType', 'employmentTypeId', 'employmentTypeName', setEmploymentNatureOptions),
        fetchMaster('masters/IndustryTypeMaster', 'industryTypeId', 'industryTypeName', setIndustryTypeOptions),
        fetchMaster('DocumentTypeMaster', 'documentTypeId', 'documentTypeName', setDocumentTypeOptions),
      ]);
      setIsLoadingMasters(false);
    }
    
    loadMasters();
  }, []);

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  const resolvedApplicationProductDetailsId = useMemo(() => {
    const raw =
      appData?.applicationProductDetailsId ??
      appData?.ApplicationProductDetailsId ??
      appData?.sections?.productDetails?.applicationProductDetailsId ??
      appData?.productDetails?.applicationProductDetailsId ??
      null;
    const num = Number(raw);
    return Number.isFinite(num) && num > 0 ? num : null;
  }, [appData]);

  const salarySlipTypeId = useMemo(
    () => resolveDocumentTypeId(documentTypeOptions, 'Salary Slip'),
    [documentTypeOptions]
  );

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('authToken');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api').replace(/\/$/, '');

    // 1. Load Applicant Salary Slip
    resolveLatestApplicantSalarySlip({
      appData,
      appId,
      applicationProductDetailsId: resolvedApplicationProductDetailsId,
      documentTypeId: salarySlipTypeId,
      baseUrl,
      headers,
    }).then((doc) => {
      if (isMounted && doc) {
        if (doc.url) blobUrlsRef.current.push(doc.url);
        setSalarySlipPreviews((prev) => ({ ...prev, applicant: doc }));
      }
    });

    // 2. Load Co-Applicants Salary Slip
    for (let idx = 0; idx < activeCount; idx++) {
      resolveLatestCoApplicantSalarySlip({
        coIndex: idx,
        appData,
        appId,
        applicationProductDetailsId: resolvedApplicationProductDetailsId,
        documentTypeId: salarySlipTypeId,
        baseUrl,
        headers,
      }).then((doc) => {
        if (isMounted && doc) {
          if (doc.url) blobUrlsRef.current.push(doc.url);
          setSalarySlipPreviews((prev) => ({ ...prev, [`co_${idx}`]: doc }));
        }
      });
    }

    return () => {
      isMounted = false;
      blobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      blobUrlsRef.current = [];
    };
  }, [appId, resolvedApplicationProductDetailsId, activeCount, salarySlipTypeId]);

  const salarySlipDocumentPeople = [
    {
      label: 'Applicant',
      previewUrl: salarySlipPreviews['applicant']?.url || null,
      isPdf: salarySlipPreviews['applicant']?.isPdf || false,
    },
    ...form.coApplicants.map((_, index) => ({
      label: `Co-Applicant ${index + 1}`,
      previewUrl: salarySlipPreviews[`co_${index}`]?.url || null,
      isPdf: salarySlipPreviews[`co_${index}`]?.isPdf || false,
    })),
  ];

  useEffect(() => {
    setForm(buildEmploymentState(getApplication(appId)));
    setErrors({});
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'employmentIncome', nextForm));
  };

  const updatePerson = (scope, field, rawValue, index = null) => {
    const value = ['grossMonthlyIncome', 'otherIncomeMonthly', 'netMonthlyIncome', 'grossAnnualIncome'].includes(field)
      ? formatIndianAmount(rawValue)
      : rawValue;

    if (scope === 'applicant') {
      persist({ ...form, applicant: { ...form.applicant, [field]: value } });
      return;
    }

    const nextCoApplicants = form.coApplicants.map((person, currentIndex) => (
      currentIndex === index ? { ...person, [field]: value } : person
    ));
    persist({ ...form, coApplicants: nextCoApplicants });
  };

  const handleContinue = async () => {
    const nextErrors = {};
    const applicantErrors = validateEmployment(form.applicant);
    Object.entries(applicantErrors).forEach(([field, message]) => {
      nextErrors[`applicant.${field}`] = message;
    });

    form.coApplicants.forEach((person, index) => {
      const personErrors = validateEmployment(person);
      Object.entries(personErrors).forEach(([field, message]) => {
        nextErrors[`coApplicants.${index}.${field}`] = message;
      });
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setErrorPopup({
        title: 'Validation Error',
        message: 'Please fill all required employment and income fields before continuing.',
        variant: 'validation',
      });
      return;
    }

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api').replace(/\/$/, '');
    const allPersons = [
      { ...form.applicant, isPrimary: true },
      ...form.coApplicants.map((co, i) => ({ ...co, index: i, isPrimary: false }))
    ];

    try {
      const claimedEmpRecordIds = new Set();

      for (const person of allPersons) {
        const addressId = person.isPrimary
          ? appData.sections?.addressDetails?.applicant?.addressDetailsId || appData.addressDetails?.applicant?.addressDetailsId
          : appData.sections?.addressDetails?.coApplicants?.[person.index]?.addressDetailsId || appData.addressDetails?.coApplicants?.[person.index]?.addressDetailsId;

        if (!addressId) {
          console.warn(`No Address Details ID found for ${person.isPrimary ? 'Applicant' : `Co-Applicant ${person.index + 1}`}, skipping Employment API save`);
          continue;
        }

        let currentEmpId = person.employmentIncomeDetailsId ? Number(person.employmentIncomeDetailsId) : null;

        // Prevent shared employment record ID across persons: if already claimed, clear it to force POST
        if (currentEmpId && claimedEmpRecordIds.has(currentEmpId)) {
          currentEmpId = null;
          person.employmentIncomeDetailsId = null;
        }

        // Before PUT verify: if existing employment has a known address ID that does not match current addressId, do not reuse
        if (currentEmpId && person.applicationAddressDetailsId && Number(person.applicationAddressDetailsId) !== Number(addressId)) {
          currentEmpId = null;
          person.employmentIncomeDetailsId = null;
        }

        const isUpdate = Boolean(currentEmpId);
        const url = isUpdate
          ? `${baseUrl}/ApplicationEmploymentIncomeDetails/${currentEmpId}`
          : `${baseUrl}/ApplicationEmploymentIncomeDetails`;

        const payload = {
          ApplicationAddressDetailsId: Number(addressId),
          EmployerBusinessName: person.employerBusinessName || '',
          DesignationNatureOfBusiness: person.designationNatureOfBusiness || '',
          EmploymentTypeId: person.employmentNature ? Number(person.employmentNature) : 1,
          EducationId: person.qualification ? Number(person.qualification) : 1,
          IndustryType: person.industryType ? String(person.industryType) : '',
          TotalExperience: Number(person.totalExperienceYears) || 0,
          GrossMonthlyIncome: parseAmountToNumber(person.grossMonthlyIncome),
          OtherMonthlyIncome: parseAmountToNumber(person.otherIncomeMonthly),
          CreatedBy: 1
        };

        if (isUpdate) {
          payload.ApplicationEmploymentIncomeDetailsId = Number(currentEmpId);
        }

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
        
        const savedId = savedData?.applicationEmploymentIncomeDetailsId || savedData?.ApplicationEmploymentIncomeDetailsId;
        if (savedId) {
          person.employmentIncomeDetailsId = Number(savedId);
          claimedEmpRecordIds.add(Number(savedId));
        } else if (currentEmpId) {
          claimedEmpRecordIds.add(currentEmpId);
        }

        const backendNetMonthly = savedData?.netMonthlyIncome ?? savedData?.NetMonthlyIncome;
        if (backendNetMonthly !== undefined && backendNetMonthly !== null && backendNetMonthly !== '') {
          person.netMonthlyIncome = formatIndianAmount(backendNetMonthly);
        }

        const backendGrossAnnual = savedData?.grossAnnualIncome ?? savedData?.GrossAnnualIncome;
        if (backendGrossAnnual !== undefined && backendGrossAnnual !== null && backendGrossAnnual !== '') {
          person.grossAnnualIncome = formatIndianAmount(backendGrossAnnual);
        }
      }

      const finalApplicant = {
        ...form.applicant,
        employmentIncomeDetailsId: allPersons[0]?.employmentIncomeDetailsId || form.applicant?.employmentIncomeDetailsId || null,
        netMonthlyIncome: allPersons[0]?.netMonthlyIncome || form.applicant?.netMonthlyIncome || '',
        grossAnnualIncome: allPersons[0]?.grossAnnualIncome || form.applicant?.grossAnnualIncome || '',
      };

      const finalCoApplicants = form.coApplicants.map((co, i) => {
        let coEmpId = allPersons[i + 1]?.employmentIncomeDetailsId || co.employmentIncomeDetailsId || null;
        if (coEmpId && coEmpId === finalApplicant.employmentIncomeDetailsId) {
          coEmpId = null;
        }
        return {
          ...co,
          employmentIncomeDetailsId: coEmpId,
          netMonthlyIncome: allPersons[i + 1]?.netMonthlyIncome || co.netMonthlyIncome || '',
          grossAnnualIncome: allPersons[i + 1]?.grossAnnualIncome || co.grossAnnualIncome || '',
        };
      });

      const finalForm = {
        ...form,
        applicant: finalApplicant,
        coApplicants: finalCoApplicants,
      };

      saveApplication(appId, buildSectionUpdate(appData, 'employmentIncome', finalForm));
      navigate(ROUTES.BANK_EXISTING_LOANS.replace(':applicationId', appId));
    } catch (err) {
      console.error('Error saving Employment Details:', err);
      setErrorPopup({
        title: 'Connection error',
        message: 'Network error while saving employment details. Please try again.',
        variant: 'error',
      });
    }
  };

  const handleBack = () => {
    navigate(ROUTES.ADDRESS_DETAILS.replace(':applicationId', appId));
  };

  return (
    <>
      <ErrorPopup
        show={!!errorPopup}
        title={errorPopup?.title}
        message={errorPopup?.message}
        details={errorPopup?.details}
        variant={errorPopup?.variant}
        onClose={() => setErrorPopup(null)}
      />
      <WizardSectionLayout
        appId={appId}
        appData={appData}
        steps={APPLICATION_WIZARD_STEPS}
        activeStep={5}
        title="Step 5: Employment & Income Details"
        subtitle="Capture applicant and co-applicant employment profile and income details."
        backLabel="Back to Address Details"
        continueLabel="Save & Continue"
        onBack={handleBack}
        onContinue={handleContinue}
        onStepClick={(step) => navigate(step.route.replace(':applicationId', appId))}
        headerAction={
          <Button
            variant="secondary"
            size="sm"
            icon={ArrowLeftIcon ? <ArrowLeftIcon size={14} /> : null}
            onClick={handleBack}
          >
            Back to Address Details
          </Button>
        }
        metaAction={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocsModal(true)}
          >
            View Salary Slip
          </Button>
        }
        footerHint={`Employment and income data is stored for ${activeCount > 1 ? `${activeCount} applicant records` : 'the applicant record'} on the same application.`}
      >
        <EmploymentCard
          title="Applicant Employment & Income"
          person={form.applicant}
          onChange={(field, value) => updatePerson('applicant', field, value)}
          errors={Object.fromEntries(
            Object.entries(errors)
              .filter(([key]) => key.startsWith('applicant.'))
              .map(([key, value]) => [key.split('.').slice(1).join('.'), value]),
          )}
          qualificationOptions={qualificationOptions}
          employmentNatureOptions={employmentNatureOptions}
          industryTypeOptions={industryTypeOptions}
          isLoadingMasters={isLoadingMasters}
        />

        {activeCount > 0 && form.coApplicants.map((person, index) => (
          <EmploymentCard
            key={`co-employment-${index}`}
            title={`Co-Applicant ${index + 1} Employment & Income`}
            person={person}
            onChange={(field, value) => updatePerson('coApplicants', field, value, index)}
            errors={Object.fromEntries(
              Object.entries(errors)
                .filter(([key]) => key.startsWith(`coApplicants.${index}.`))
                .map(([key, value]) => [key.split('.').slice(2).join('.'), value]),
            )}
            qualificationOptions={qualificationOptions}
            employmentNatureOptions={employmentNatureOptions}
            industryTypeOptions={industryTypeOptions}
            isLoadingMasters={isLoadingMasters}
          />
        ))}
      </WizardSectionLayout>

      <Modal 
        show={showDocsModal} 
        onHide={() => setShowDocsModal(false)} 
        title="Salary Slip Document View"
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
          {salarySlipDocumentPeople.map((person) => (
            <div key={person.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{person.label}</h4>
              {person.previewUrl ? (
                person.isPdf ? (
                  <div
                    style={{
                      width: '100%',
                      height: '350px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <iframe
                      src={person.previewUrl}
                      title={`${person.label} Salary Slip`}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '240px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setFullViewDoc({ url: person.previewUrl, isPdf: false })}
                    title="Click to view full size"
                  >
                    <img
                      src={person.previewUrl}
                      alt={`${person.label} Salary Slip`}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', transition: 'transform 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                )
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100px',
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    border: '1px dashed #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontSize: '13px'
                  }}
                >
                  Salary Slip not available
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        show={Boolean(fullViewDoc)}
        onHide={() => setFullViewDoc(null)}
        title="Full View"
        size="lg"
      >
        <div style={{ width: '100%', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          {fullViewDoc && (
            fullViewDoc.isPdf ? (
              <iframe
                src={fullViewDoc.url}
                title="Full View PDF"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <img src={fullViewDoc.url} alt="Full View" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            )
          )}
        </div>
      </Modal>
    </>
  );
}
