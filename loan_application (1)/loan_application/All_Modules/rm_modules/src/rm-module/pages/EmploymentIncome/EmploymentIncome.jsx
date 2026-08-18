import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Briefcase, UserCog, GraduationCap, Factory, Clock, IndianRupee } from 'lucide-react';
import iconMap from '../../config/iconMap';
import Button from '../../components/Button/Button';
import { ROUTES } from '../../config/routeConfig';
import { APPLICATION_WIZARD_STEPS } from '../../config/applicationWizard';
import { useApplicationDraftStore } from '../../state/ApplicationDraftContext';
import WizardSectionLayout from '../../components/WizardSectionLayout/WizardSectionLayout';
import {
  buildSectionUpdate,
  createArray,
  getApplicantCount,
  getSectionState,
} from '../applicationWizard/flowUtils';

const EMPLOYMENT_OPTIONS = ['Salaried', 'Self-Employed'];

function buildEmploymentState(appData) {
  const saved = getSectionState(appData, 'employmentIncome', {});
  const count = getApplicantCount(appData);
  const savedCoApplicants = Array.isArray(saved.coApplicants) ? saved.coApplicants : [];

  const createPerson = (source = {}) => ({
    employerBusinessName: source.employerBusinessName || '',
    designationNatureOfBusiness: source.designationNatureOfBusiness || '',
    employmentNature: source.employmentNature || '',
    qualification: source.qualification || '',
    industryType: source.industryType || '',
    totalExperienceYears: source.totalExperienceYears || '',
    grossMonthlyIncome: source.grossMonthlyIncome || '',
    otherIncomeMonthly: source.otherIncomeMonthly || '',
    netMonthlyIncome: source.netMonthlyIncome || '',
    grossAnnualIncome: source.grossAnnualIncome || '',
  });

  return {
    applicant: createPerson(saved.applicant),
    coApplicants: createArray(count, (index) => createPerson(savedCoApplicants[index])),
  };
}

function validateEmployment(person) { return {}; }

function EmploymentCard({ title, person, onChange, errors }) {
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
              <UserCog className="aw-input-icon" size={14} />
              <select
                className={`form-select aw-input aw-input--with-icon ${errors.employmentNature ? 'aw-input--invalid' : ''}`}
                value={person.employmentNature}
                onChange={(e) => onChange('employmentNature', e.target.value)}
              >
                <option value="">Select employment nature</option>
                {EMPLOYMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            {errors.employmentNature && <span className="aw-field-error">{errors.employmentNature}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Qualification</label>
            <div className="aw-input-wrapper">
              <GraduationCap className="aw-input-icon" size={14} />
              <input
                className="form-input aw-input aw-input--with-icon"
                value={person.qualification}
                onChange={(e) => onChange('qualification', e.target.value)}
              />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Industry Type</label>
            <div className="aw-input-wrapper">
              <Factory className="aw-input-icon" size={14} />
              <input
                className="form-input aw-input aw-input--with-icon"
                value={person.industryType}
                onChange={(e) => onChange('industryType', e.target.value)}
              />
            </div>
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
                type="number"
                min="0"
                step="1"
                value={person.grossMonthlyIncome}
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
                type="number"
                min="0"
                step="1"
                value={person.otherIncomeMonthly}
                onChange={(e) => onChange('otherIncomeMonthly', e.target.value)}
              />
            </div>
          </div>

          <div className="aw-field">
            <label className="form-label">Net Monthly Income (Rs.)</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.netMonthlyIncome ? 'aw-input--invalid' : ''}`}
                type="number"
                min="0"
                step="1"
                value={person.netMonthlyIncome}
                onChange={(e) => onChange('netMonthlyIncome', e.target.value)}
              />
            </div>
            {errors.netMonthlyIncome && <span className="aw-field-error">{errors.netMonthlyIncome}</span>}
          </div>

          <div className="aw-field">
            <label className="form-label">Gross Annual Income (Rs.)</label>
            <div className="aw-input-wrapper">
              <IndianRupee className="aw-input-icon" size={14} />
              <input
                className={`form-input aw-input aw-input--with-icon ${errors.grossAnnualIncome ? 'aw-input--invalid' : ''}`}
                type="number"
                min="0"
                step="1"
                value={person.grossAnnualIncome}
                onChange={(e) => onChange('grossAnnualIncome', e.target.value)}
              />
            </div>
            {errors.grossAnnualIncome && <span className="aw-field-error">{errors.grossAnnualIncome}</span>}
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

  useEffect(() => {
    ensureApplication(appId);
  }, [appId, ensureApplication]);

  const appData = getApplication(appId);
  const activeCount = useMemo(() => getApplicantCount(appData), [appData]);
  const ArrowLeftIcon = iconMap['ArrowLeft'];
  const InfoIcon = iconMap['Info'];

  useEffect(() => {
    setForm(buildEmploymentState(getApplication(appId)));
    setErrors({});
  }, [appId, getApplication]);

  const persist = (nextForm) => {
    setForm(nextForm);
    saveApplication(appId, buildSectionUpdate(appData, 'employmentIncome', nextForm));
  };

  const updatePerson = (scope, field, value, index = null) => {
    if (scope === 'applicant') {
      persist({ ...form, applicant: { ...form.applicant, [field]: value } });
      return;
    }

    const nextCoApplicants = form.coApplicants.map((person, currentIndex) => (
      currentIndex === index ? { ...person, [field]: value } : person
    ));
    persist({ ...form, coApplicants: nextCoApplicants });
  };

  const handleContinue = () => {
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
      return;
    }

    saveApplication(appId, buildSectionUpdate(appData, 'employmentIncome', form));
    navigate(ROUTES.BANK_EXISTING_LOANS.replace(':applicationId', appId));
  };

  const handleBack = () => {
    navigate(ROUTES.ADDRESS_DETAILS.replace(':applicationId', appId));
  };

  return (
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
        />
      ))}
    </WizardSectionLayout>
  );
}
