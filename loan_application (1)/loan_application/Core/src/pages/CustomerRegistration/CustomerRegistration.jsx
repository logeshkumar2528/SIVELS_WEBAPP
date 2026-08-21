import './CustomerRegistration.css';
import '../../styles/StandardUI.css';
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout';
import FormCard from './FormCard';
import Input from '../../components/common/Input/Input';
import Select from '../../components/common/Select/Select';
import Textarea from '../../components/common/Textarea/Textarea';
import Checkbox from '../../components/common/Checkbox/Checkbox';
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  Building,
  UserCircle2,
  Mail,
  Calendar,
  Building2,
  Receipt,
  Landmark,
  Users,
  Hash
} from 'lucide-react';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

// KYC step (moved in from the standalone CustomerVerification page)
import '../CustomerVerification/CustomerVerification.css';
import { useKycFlow } from '../CustomerVerification/useKycFlow';
import AadhaarVerificationCard from '../CustomerVerification/components/AadhaarVerificationCard';
import PANVerificationCard from '../CustomerVerification/components/PANVerificationCard';
import CreditScoreCard from '../CustomerVerification/components/CreditScoreCard';
import DigiLockerModal from '../CustomerVerification/components/DigiLockerModal';
import OTPVerificationModal from '../CustomerVerification/components/OTPVerificationModal';
import ConsentModal from '../CustomerVerification/components/ConsentModal';
import LoadingOverlay from '../../components/common/Loading';
import { ShieldCheck } from 'lucide-react';

const CustomerRegistration = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [currentAddress, setCurrentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const kyc = useKycFlow();

  // A step (1-6) is "completed" once every required/pattern-constrained field
  // inside its FormCard passes native HTML5 validation. Step 7 (KYC) is driven
  // by the existing kyc.isKycComplete flag instead of form fields.
  //
  // This is evaluated sequentially and stops at the first incomplete step —
  // that's what keeps completedSteps a contiguous prefix (e.g. [1,2,3], never
  // [1,3]) and prevents a later *locked* step's disabled fields from being
  // misread as "valid" (disabled fields always pass checkValidity()).
  const recomputeCompletedSteps = () => {
    const completed = [];
    let priorStepsOk = true;
    for (let stepId = 1; stepId <= 6; stepId++) {
      if (!priorStepsOk) break;
      const stepEl = document.getElementById(`step-${stepId}`);
      const fields = stepEl ? stepEl.querySelectorAll('input[name], select[name], textarea[name]') : [];
      // A disabled field always reports checkValidity() === true, no matter
      // what it contains — the browser skips constraint validation for it
      // entirely. That's a problem for two different reasons here:
      //  1. A future *locked* step's fields are disabled (via the fieldset)
      //     and empty — but combined with this function reading the DOM
      //     synchronously, before React commits the disabled attribute for
      //     later steps, they'd be misread as "valid" on the same tick a
      //     prior step first becomes complete.
      //  2. Permanent Address is individually disabled once "Same as
      //     Current Address" is checked — but at that point it also becomes
      //     not-required and holds a real mirrored value, so it genuinely
      //     IS complete and shouldn't be excluded just for being disabled.
      // So: for a still-required field, check the actual value directly
      // (this is what catches case 1, since a locked field's `required`
      // attribute is untouched by disabling). Only fall back to
      // checkValidity()'s disabled-bypass once we know the field isn't
      // required, or already has a value (this is what allows case 2).
      const fieldOk = (field) => {
        if (field.required && !field.value) return false;
        if (field.disabled) return true;
        return field.checkValidity();
      };
      const stepValid = fields.length > 0 && Array.from(fields).every(fieldOk);
      if (stepValid) {
        completed.push(stepId);
      } else {
        priorStepsOk = false;
      }
    }
    if (priorStepsOk && kyc.isKycComplete) completed.push(7);
    setCompletedSteps(completed);
  };

  // A step is locked (not yet reachable) if any step before it isn't completed yet.
  const isStepLocked = (stepId) => {
    for (let i = 1; i < stepId; i++) {
      if (!completedSteps.includes(i)) return true;
    }
    return false;
  };

  useEffect(() => {
    recomputeCompletedSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kyc.isKycComplete]);



  const handleCurrentAddressChange = (e) => {
    const val = e.target.value;
    setCurrentAddress(val);
    if (sameAsCurrent) {
      setPermanentAddress(val);
    }
  };

  const handleSameAsCurrentChange = (e) => {
    const isChecked = e.target.checked;
    setSameAsCurrent(isChecked);
    if (isChecked) {
      setPermanentAddress(currentAddress);
    }
  };

  const handleSidebarClick = (stepId) => {
    if (isStepLocked(stepId)) return; // hard lock: current step must be valid first
    setActiveStep(stepId);
    const element = document.getElementById(`step-${stepId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <DashboardLayout 
      title="Customer Registration"
      sidebarActiveStep={activeStep}
      onSidebarStepClick={handleSidebarClick}
      sidebarCompletedSteps={completedSteps}
      hideProfile={true}
      rightContent={
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="std-btn std-btn-secondary" onClick={() => navigate('/')} disabled={loading}>
            Cancel
          </button>
          <button
            type="submit"
            form="customer-registration-form"
            className="std-btn std-btn-primary"
            disabled={loading || !kyc.isKycComplete}
            title={!kyc.isKycComplete ? 'Complete KYC verification (Step 7) before registering' : undefined}
          >
            Register
          </button>
        </div>
      }
    >
      <form 
        id="customer-registration-form"
        className="customer-registration-content"
        onInput={recomputeCompletedSteps}
        onChange={recomputeCompletedSteps}
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData.entries());
          
          const payload = {
            ...data,
            permanentAddress: permanentAddress,
            salary: Number(data.salary) || 0,
            annualTurnover: String(data.annualTurnover || ''),
            // KYC results captured during Step 6 — adjust field names to match backend contract
            aadhaar: kyc.aadhaarData,
            pan: kyc.panData,
            creditScore: kyc.creditScoreData
          };

          try {
            setLoading(true);
            setError(null);
            await authService.register(payload);
            navigate('/', { state: { showRegistrationSuccess: true } });
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        }}
      >
        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem', color: '#EF4444', backgroundColor: '#FEE2E2', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #F87171' }}>
            {error}
          </div>
        )}
        <div className="registration-forms-grid" style={{ opacity: loading ? 0.7 : 1 }}>
            
            {/* Row 1 */}
            <div className="forms-row forms-row-1">
              <FormCard id="step-1" title="Personal Information" icon={User} className="personal-card" onFocusCapture={() => setActiveStep(1)}>
                <fieldset disabled={isStepLocked(1)} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, opacity: isStepLocked(1) ? 0.55 : 1 }}>
                <div className="form-grid-2">
                  <Input name="firstName" label="First Name" required maxLength={50} pattern="[A-Za-z\s\-]+" title="Only letters are allowed" placeholder="Enter first name" icon={UserCircle2} />
                  <Input name="lastName" label="Last Name" required maxLength={50} pattern="[A-Za-z\s\-]+" title="Only letters are allowed" placeholder="Enter last name" icon={UserCircle2} />
                </div>
                <div className="form-grid-3">
                  <Input name="dateOfBirth" label="Date of Birth" required type="date" icon={Calendar} />
                  <Select name="gender" label="Gender" required options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ]} placeholder="Select gender" />
                  <Select name="maritalStatus" label="Marital Status" required options={[
                    { value: 'single', label: 'Single' },
                    { value: 'married', label: 'Married' }
                  ]} placeholder="Select status" />
                </div>
                </fieldset>
              </FormCard>
              
              <FormCard id="step-2" title="Contact Information" icon={Phone} className="contact-card" onFocusCapture={() => setActiveStep(2)}>
                <fieldset disabled={isStepLocked(2)} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, opacity: isStepLocked(2) ? 0.55 : 1 }}>
                <div className="form-col">
                  <Input name="mobileNumber" label="Mobile Number" required type="tel" maxLength={10} minLength={10} pattern="[0-9]{10}" title="Mobile number must be exactly 10 digits" placeholder="Enter mobile number" icon={Phone} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />
                  <Input name="email" label="Email Address" required type="email" maxLength={100} pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$" title="Please enter a valid email address (e.g., name@example.com)" placeholder="Enter email address" icon={Mail} />
                </div>
                </fieldset>
              </FormCard>
            </div>
            
            {/* Row 2 */}
            <FormCard id="step-3" title="Address Information" icon={MapPin} className="address-card" onFocusCapture={() => setActiveStep(3)}>
              <fieldset disabled={isStepLocked(3)} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, opacity: isStepLocked(3) ? 0.55 : 1 }}>
              <div className="form-grid-2 align-start">
                <Textarea 
                  name="currentAddress"
                  label="Current Address" 
                  required 
                  maxLength={250}
                  minLength={10}
                  placeholder="Enter current address" 
                  value={currentAddress}
                  onChange={handleCurrentAddressChange}
                />
                <div className="permanent-address-col">
                  <Textarea 
                    name="permanentAddress"
                    label="Permanent Address" 
                    required={!sameAsCurrent}
                    maxLength={250}
                    minLength={10}
                    placeholder="Enter permanent address" 
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    disabled={sameAsCurrent}
                  />
                  <Checkbox 
                    label="Same as Current Address" 
                    className="same-address-cb" 
                    checked={sameAsCurrent}
                    onChange={handleSameAsCurrentChange}
                  />
                </div>
              </div>
              </fieldset>
            </FormCard>
            
            {/* Row 3 */}
            <div className="forms-row forms-row-2">
              <FormCard id="step-4" title="Employment Information" icon={Briefcase} className="employment-card" onFocusCapture={() => setActiveStep(4)}>
                <fieldset disabled={isStepLocked(4)} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, opacity: isStepLocked(4) ? 0.55 : 1 }}>
                <div className="form-grid-2">
                  <Input name="employerName" label="Employer Name" required maxLength={100} placeholder="Enter employer name" icon={UserCircle2} />
                  <Input name="designation" label="Designation" required maxLength={50} placeholder="Enter designation" icon={Briefcase} />
                </div>
                <div className="form-grid-2">
                  <Input name="salary" label="Salary" required type="number" min="0" max="999999999" placeholder="Enter salary" icon={() => <span style={{marginLeft: '4px'}}>₹</span>} />
                </div>
                </fieldset>
              </FormCard>
              
              <FormCard id="step-5" title="Business Information" icon={Building} className="business-card" onFocusCapture={() => setActiveStep(5)}>
                <fieldset disabled={isStepLocked(5)} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, opacity: isStepLocked(5) ? 0.55 : 1 }}>
                <div className="form-grid-2">
                  <Input name="gstNumber" label="GST Number" required maxLength={15} minLength={15} pattern="[A-Za-z0-9]{15}" title="GST number must be exactly 15 alphanumeric characters" placeholder="Enter GST number" icon={Receipt} />
                  <Input name="annualTurnover" label="Annual Turnover" required type="number" min="0" max="9999999999" placeholder="Enter annual turnover" icon={() => <span style={{marginLeft: '4px'}}>₹</span>} />
                </div>
                <div className="form-grid-2">
                  <Input name="natureOfBusiness" label="Nature of Business" required maxLength={100} placeholder="Enter nature of business" icon={Building2} />
                </div>
                </fieldset>
              </FormCard>
            </div>

            {/* Row 4 — Step 6: Bank (Bank Information + Nominee, moved in from CustomerProfile) */}
            <FormCard id="step-6" title="Bank" icon={Landmark} className="bank-card" onFocusCapture={() => setActiveStep(6)}>
              <fieldset disabled={isStepLocked(6)} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, opacity: isStepLocked(6) ? 0.55 : 1 }}>
              <div style={{ marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>Bank Information</h3>
              </div>
              <div className="form-grid-2">
                <Input name="bankAccountNumber" label="Bank Account Number" required placeholder="Account Number" icon={Hash} />
                <Input name="ifscCode" label="IFSC Code" required placeholder="e.g. HDFC0001234" icon={Landmark} />
              </div>

              <div style={{ margin: '28px 0 24px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#1e293b' }}>Nominee & Emergency Contact</h3>
              </div>
              <div className="form-grid-3">
                <Input name="nomineeName" label="Nominee 1 Name" required placeholder="Full Name" icon={UserCircle2} />
                <Select name="nomineeRelationship" label="Relationship (Nominee 1)" required options={[
                  { value: 'spouse', label: 'Spouse' },
                  { value: 'parent', label: 'Parent' },
                  { value: 'child', label: 'Child' },
                  { value: 'sibling', label: 'Sibling' },
                  { value: 'other', label: 'Other' }
                ]} placeholder="Select relationship" />
                <Input name="nominee1Number" label="Nominee 1 Number" required type="tel" maxLength={10} minLength={10} pattern="[0-9]{10}" title="Must be exactly 10 digits" placeholder="10-digit number" icon={Phone} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />

                <Input name="nominee2Name" label="Nominee 2 Name" required placeholder="Full Name" icon={UserCircle2} />
                <Select name="nominee2Relationship" label="Relationship (Nominee 2)" required options={[
                  { value: 'spouse', label: 'Spouse' },
                  { value: 'parent', label: 'Parent' },
                  { value: 'child', label: 'Child' },
                  { value: 'sibling', label: 'Sibling' },
                  { value: 'other', label: 'Other' }
                ]} placeholder="Select relationship" />
                <Input name="nominee2Number" label="Nominee 2 Number" required type="tel" maxLength={10} minLength={10} pattern="[0-9]{10}" title="Must be exactly 10 digits" placeholder="10-digit number" icon={Phone} onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')} />
              </div>
              </fieldset>
            </FormCard>

            {/* Row 5 — Step 7: KYC Verification (moved in from the standalone CustomerVerification page) */}
            <FormCard id="step-7" title="KYC Verification" icon={ShieldCheck} className="kyc-step-card" onFocusCapture={() => setActiveStep(7)}>
              <fieldset disabled={isStepLocked(7)} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0, opacity: isStepLocked(7) ? 0.55 : 1 }}>
              <p className="kyc-intro-subtitle" style={{ marginBottom: '1.25rem' }}>
                Complete Aadhaar, PAN, and credit score verification to enable registration.
              </p>

              <AadhaarVerificationCard
                status={kyc.aadhaarStatus}
                data={kyc.aadhaarData}
                onVerify={kyc.openDigiLocker}
              />
              <PANVerificationCard
                status={kyc.panStatus}
                data={kyc.panData}
                onVerify={kyc.verifyPan}
              />
              <CreditScoreCard
                status={kyc.creditScoreStatus}
                data={kyc.creditScoreData}
              />

              {kyc.isKycComplete && (
                <div style={{ marginTop: '1rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} />
                  <span>KYC complete — you can now submit registration.</span>
                </div>
              )}
              </fieldset>
            </FormCard>

        </div>
        
      </form>

      {/* KYC flow modals */}
      {kyc.activeModal === 'digilocker' && (
        <DigiLockerModal onSendOtp={kyc.submitMobileNumber} onClose={kyc.closeModal} />
      )}
      {kyc.activeModal === 'otp' && (
        <OTPVerificationModal
          mobileNumber={kyc.mobileNumber}
          onVerify={kyc.verifyOtp}
          onClose={kyc.closeModal}
        />
      )}
      {kyc.activeModal === 'consent' && (
        <ConsentModal onAllow={kyc.allowConsent} onCancel={kyc.closeModal} />
      )}

      {/* Shared loading overlay used by the KYC verification steps */}
      <LoadingOverlay
        isOpen={Boolean(kyc.loadingPhase)}
        variant={kyc.loadingPhase || 'loading'}
        message={kyc.loadingMessage}
      />
    </DashboardLayout>
  );
};

export default CustomerRegistration;