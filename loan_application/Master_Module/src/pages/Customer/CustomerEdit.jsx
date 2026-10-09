import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  IndianRupee,
  Info,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  Save,
  User,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { agentCustomerService } from '../../../../Core/src/services/agentCustomerService';
import { getCurrentUserId } from '../../utils/authHelper';
import { formatDateTime, formatDateTimeFriendly } from '../../utils/dateHelper';
import '../RelationshipManager/RelationshipManagerCreate.css';

const resolveAdminUserId = () => {
  try {
    const raw = localStorage.getItem('sivels_currentUser');
    if (raw) {
      const parsed = JSON.parse(raw);
      const id = parsed?.userId ?? parsed?.id ?? parsed?.sub ?? parsed?.adminId;
      if (id !== null && id !== undefined && id !== '') {
        const num = Number(id);
        if (Number.isInteger(num) && num > 0) {
          return num;
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  try {
    const helperId = getCurrentUserId?.();
    if (helperId !== null && helperId !== undefined && helperId !== '') {
      const num = Number(helperId);
      if (Number.isInteger(num) && num > 0) {
        return num;
      }
    }
  } catch {
    // ignore
  }

  return null;
};

const formatAmount = (amount) => {
  const num = Number(String(amount ?? '').replace(/[^0-9.-]/g, '')) || 0;
  return num > 0
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(num)
    : '—';
};

const isValidEmail = (value) => {
  if (!value) return true; // email is optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
};

const isValidMobile = (value) => /^[6-9]\d{9}$/.test(String(value || '').trim());

export default function CustomerEdit({ onSuccessRedirect = '/customers' } = {}) {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const numericCustomerId = customerId ? Number(customerId) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Original data for detecting changes and read-only context
  const [originalData, setOriginalData] = useState(null);
  const [contextData, setContextData] = useState(null);

  // Form State for Editable Fields
  const [form, setForm] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    remarks: '',
  });

  // Status check: Only status === 0 is editable
  const isStatusZero = useMemo(() => {
    if (!contextData) return false;
    const raw = contextData.rawStatus;
    if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return false;
    const num = Number(raw);
    return !Number.isNaN(num) && num === 0;
  }, [contextData]);

  useEffect(() => {
    if (!numericCustomerId) {
      setError('Invalid Customer ID provided.');
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchCustomer = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await agentCustomerService.getCustomerById(numericCustomerId);
        const data = response?.value ?? response?.data ?? response;

        if (!data || typeof data !== 'object') {
          throw new Error('Customer record not found.');
        }

        if (isMounted) {
          const rawStatus = data.status ?? data.Status ?? data.applicationStatus ?? data.ApplicationStatus ?? '0';
          const fullName = data.fullName ?? data.FullName ?? data.customerName ?? '';
          const mobileNumber = data.mobileNumber ?? data.MobileNumber ?? data.mobile ?? '';
          const email = data.email ?? data.Email ?? data.emailAddress ?? '';
          const remarks = data.remarks ?? data.Remarks ?? '';

          setForm({
            fullName,
            mobileNumber,
            email: email || '',
            remarks: remarks || '',
          });

          setOriginalData({
            fullName,
            mobileNumber,
            email: email || '',
            remarks: remarks || '',
          });

          setContextData({
            id: data.agentCustomerId ?? data.AgentCustomerId ?? numericCustomerId,
            rawStatus,
            statusName: data.statusName ?? data.StatusName ?? (String(rawStatus) === '0' ? 'New / Draft' : `Status #${rawStatus}`),
            loanPurpose: data.loanPurposeName ?? data.LoanPurposeName ?? data.loanType ?? '—',
            amount: data.expectedLoanAmount ?? data.ExpectedLoanAmount ?? data.loanAmount ?? null,
            employmentType: data.employmentTypeName ?? data.EmploymentTypeName ?? '—',
            agentName: data.agentName ?? data.AgentName ?? '—',
            agentPhone: data.agentMobileNumber ?? data.agentPhone ?? '—',
            rmName: data.rmName ?? data.RMName ?? '—',
            branch: data.branch ?? data.Branch ?? '—',
            createdAt: data.createdAt ?? data.CreatedAt ?? data.createdDate,
            modifiedAt: data.modifiedAt ?? data.ModifiedAt ?? data.updatedAt,
          });
        }
      } catch (err) {
        console.error('Failed to load customer details for edit:', err);
        if (isMounted) {
          const errMsg = err?.response?.data?.message || err?.message || 'Unable to load customer record. Please try again.';
          setError(errMsg);
          toast.error(errMsg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCustomer();

    return () => {
      isMounted = false;
    };
  }, [numericCustomerId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const errors = {};
    const trimmedName = form.fullName.trim();
    if (!trimmedName) {
      errors.fullName = 'Full Name is required.';
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Full Name must be at least 2 characters.';
    }

    const trimmedMobile = form.mobileNumber.trim();
    if (!trimmedMobile) {
      errors.mobileNumber = 'Mobile Number is required.';
    } else if (!isValidMobile(trimmedMobile)) {
      errors.mobileNumber = 'Please enter a valid 10-digit mobile number starting with 6-9.';
    }

    const trimmedEmail = form.email.trim();
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isStatusZero) {
      const msg = `Customer details cannot be updated because application status is ${contextData?.rawStatus ?? 'locked'}. Only applications with Status 0 can be edited.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!validate()) {
      toast.error('Please fix the validation errors before saving.');
      return;
    }

    // Build partial payload containing only explicitly changed permitted fields
    const adminId = resolveAdminUserId();
    if (!adminId) {
      const authError = 'Authentication required: Unable to resolve authenticated user ID. Please sign in again.';
      setError(authError);
      toast.error(authError);
      return;
    }

    const payload = {
      modifiedBy: adminId,
    };

    let hasChanges = false;
    const cleanTrim = (val) => String(val || '').trim();

    if (cleanTrim(form.fullName) !== cleanTrim(originalData?.fullName)) {
      payload.fullName = cleanTrim(form.fullName);
      hasChanges = true;
    }

    if (cleanTrim(form.mobileNumber) !== cleanTrim(originalData?.mobileNumber)) {
      payload.mobileNumber = cleanTrim(form.mobileNumber);
      hasChanges = true;
    }

    if (cleanTrim(form.email) !== cleanTrim(originalData?.email)) {
      payload.email = cleanTrim(form.email) || null;
      hasChanges = true;
    }

    if (cleanTrim(form.remarks) !== cleanTrim(originalData?.remarks)) {
      payload.remarks = cleanTrim(form.remarks);
      hasChanges = true;
    }

    if (!hasChanges) {
      toast('No changes detected in customer profile.', { icon: 'ℹ️' });
      navigate(onSuccessRedirect);
      return;
    }

    setSaving(true);
    try {
      await agentCustomerService.updateCustomer(numericCustomerId, payload);
      toast.success('Customer profile updated successfully.');
      navigate(onSuccessRedirect);
    } catch (err) {
      console.error('Customer update failed:', err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        'Failed to update customer. The application status may have changed.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="rm-create-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '10px' }}>
          <LoaderCircle size={24} className="rm-spinner" />
          <span>Loading customer record...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="rm-create-page">
      <button type="button" className="people-dir-back-btn" onClick={() => navigate(onSuccessRedirect)}>
        <ArrowLeft size={16} /> Back to customers
      </button>

      <header className="rm-hero" style={{ marginTop: '16px' }}>
        <div className="rm-hero-icon" style={{ background: 'linear-gradient(145deg, #0f62fe, #0043ce)' }}>
          <User size={26} />
        </div>
        <div>
          <span className="rm-eyebrow">CUSTOMER MANAGEMENT</span>
          <h1>Edit customer #{contextData?.id || numericCustomerId}</h1>
          <p>Update customer details for initial application evaluation.</p>
        </div>
      </header>

      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: '#fff1f0',
            border: '1px solid #ffccc7',
            color: '#cf1322',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Info size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Status Restriction Notice */}
      {!isStatusZero && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            color: '#874d00',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Lock size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>
              Application Status: {contextData?.statusName || contextData?.rawStatus} (Locked)
            </strong>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
              This customer profile is read-only because the application has already progressed past the initial Draft/New stage (Status 0).
              Under backend underwriting rules, customer details cannot be modified once underwriting or approval is underway.
            </p>
          </div>
        </div>
      )}

      {isStatusZero && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: '#defbe6',
            border: '1px solid #a7f0ba',
            color: '#0f6225',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <UserCheck size={18} />
          <span>
            <strong>Application Status: 0 (Draft / Editable)</strong> — Customer profile fields may be edited prior to submission.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rm-create-card">
          {/* Read-Only Application Context */}
          <section className="rm-section">
            <div className="rm-section-heading">
              <FileText size={20} />
              <div>
                <h2>Application Overview (Read-Only)</h2>
                <p>Associated underwriting and ownership context for this application.</p>
              </div>
            </div>

            <div className="rm-form-grid">
              <div className="form-group">
                <label className="form-label">Application ID</label>
                <input
                  type="text"
                  className="form-input rm-code-input"
                  value={`#${contextData?.id || numericCustomerId}`}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Application Status</label>
                <input
                  type="text"
                  className="form-input"
                  value={contextData?.statusName || `Status ${contextData?.rawStatus}`}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expected Loan Amount</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatAmount(contextData?.amount)}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Loan Purpose</label>
                <input
                  type="text"
                  className="form-input"
                  value={contextData?.loanPurpose || '—'}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Employment Type</label>
                <input
                  type="text"
                  className="form-input"
                  value={contextData?.employmentType || '—'}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Branch</label>
                <input
                  type="text"
                  className="form-input"
                  value={contextData?.branch || '—'}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Field Agent</label>
                <input
                  type="text"
                  className="form-input"
                  value={contextData?.agentName || '—'}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Relationship Manager</label>
                <input
                  type="text"
                  className="form-input"
                  value={contextData?.rmName || '—'}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Submitted On</label>
                <input
                  type="text"
                  className="form-input"
                  value={formatDateTimeFriendly(contextData?.createdAt) || '—'}
                  readOnly
                  disabled
                />
              </div>
            </div>
          </section>

          {/* Editable Customer Profile Fields */}
          <section className="rm-section">
            <div className="rm-section-heading">
              <User size={20} />
              <div>
                <h2>Customer Profile Details</h2>
                <p>Modify customer contact and identifying information.</p>
              </div>
            </div>

            <div className="rm-form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Full Name <span style={{ color: '#da1e28' }}>*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  className={`form-input ${fieldErrors.fullName ? 'rm-invalid' : ''}`}
                  placeholder="Enter customer's full legal name"
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  disabled={!isStatusZero || saving}
                />
                {fieldErrors.fullName && <span className="rm-validation-error">{fieldErrors.fullName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="mobileNumber">
                  Mobile Number <span style={{ color: '#da1e28' }}>*</span>
                </label>
                <input
                  id="mobileNumber"
                  type="tel"
                  maxLength={10}
                  className={`form-input ${fieldErrors.mobileNumber ? 'rm-invalid' : ''}`}
                  placeholder="10-digit mobile number"
                  value={form.mobileNumber}
                  onChange={(e) => handleChange('mobileNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={!isStatusZero || saving}
                />
                {fieldErrors.mobileNumber && <span className="rm-validation-error">{fieldErrors.mobileNumber}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-input ${fieldErrors.email ? 'rm-invalid' : ''}`}
                  placeholder="customer@example.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={!isStatusZero || saving}
                />
                {fieldErrors.email && <span className="rm-validation-error">{fieldErrors.email}</span>}
              </div>

              <div className="form-group rm-field-wide">
                <label className="form-label" htmlFor="remarks">
                  Remarks / Notes
                </label>
                <textarea
                  id="remarks"
                  className="form-input"
                  rows={3}
                  style={{ minHeight: '80px', padding: '10px 12px' }}
                  placeholder="Add optional notes or remarks regarding this customer"
                  value={form.remarks}
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  disabled={!isStatusZero || saving}
                />
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="masters-btn-secondary"
              onClick={() => navigate(onSuccessRedirect)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="masters-btn-primary"
              disabled={!isStatusZero || saving}
              title={!isStatusZero ? 'Customer details cannot be updated because application status is not 0.' : 'Save changes'}
            >
              {saving ? (
                <>
                  <LoaderCircle size={16} className="rm-spinner" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
