import { User, DollarSign, Calendar, Percent, Shield, Award, UserCheck, Briefcase } from 'lucide-react';
import { getInitials } from '../../../../../Core/src/utils/profileImageHelper';

const STATUS_LABELS = {
  0: { label: 'Draft / New', className: 'app360-status-draft' },
  1: { label: 'Pending (RM)', className: 'app360-status-pending' },
  2: { label: 'Logged to HO', className: 'app360-status-ho' },
  3: { label: 'Under Review', className: 'app360-status-review' },
  4: { label: 'Approved', className: 'app360-status-approved' },
  5: { label: 'Rejected', className: 'app360-status-rejected' },
  6: { label: 'Returned', className: 'app360-status-returned' },
};

function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(amount));
}

export function ApplicationSummaryHeader({ 
  data, 
  displayApplicationId = '', 
  rawApplicationId = '', 
  resolvedPan = '—',
  primaryApplicant = null
}) {
  if (!data) return null;

  const customer = data.customer || {};
  const product = data.productDetails || (data.productDetailsList && data.productDetailsList[0]) || {};
  const ownership = data.ownership || {};
  const agent = ownership.agent || {};
  const rm = ownership.rm || {};

  const primaryPerson = primaryApplicant?.person || {};

  // Resolve Customer Name
  const fullName = customer.fullName || 
    `${primaryPerson.firstName || customer.firstName || ''} ${primaryPerson.lastName || customer.lastName || ''}`.trim() || 
    data.fullName || 
    '—';

  const initials = getInitials(fullName !== '—' ? fullName : 'A', 'A');

  // Resolve Status
  const rawStatus = customer.status !== undefined ? customer.status : data.status;
  const numStatus = Number(rawStatus);
  const statusConfig = STATUS_LABELS[numStatus] || {
    label: customer.stage || (rawStatus !== undefined ? `Status ${rawStatus}` : '—'),
    className: 'app360-status-default'
  };

  // Resolve Real Loan Details
  const loanAmount = product.loanAmount ?? customer.loanAmount ?? data.loanAmount;
  const loanTenure = product.loanTenure ?? customer.loanTenure ?? product.tenure ?? customer.tenure ?? data.tenure;
  const roi = product.roi ?? customer.roi ?? product.rateOfInterest ?? customer.rateOfInterest ?? data.rateOfInterest;

  // Resolve Real Ownership
  const channel = ownership.source || data.customerSource || customer.customerSource || '—';
  const agentName = agent.agentName || data.agentName || customer.agentName || '—';
  const rmName = rm.rmName || data.rmName || customer.rmName || '—';
  const rmCode = rm.rmCode || data.rmCode || customer.rmCode || (rm.rmId ? `RM-${rm.rmId}` : null);

  const mainAppId = displayApplicationId || rawApplicationId || '—';

  return (
    <div className="app360-summary-card">
      <div className="app360-summary-main">
        <div className="app360-avatar-wrapper">
          <div className="app360-avatar" aria-label={fullName}>
            {initials}
          </div>
        </div>

        <div className="app360-applicant-info">
          <div className="app360-applicant-header">
            <h1 className="app360-applicant-name">{fullName}</h1>
            <span className={`app360-badge ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>

          <div className="app360-meta-pills">
            <span className="app360-pill">
              <strong>App ID:</strong> {mainAppId} {rawApplicationId && rawApplicationId !== mainAppId ? `(#${data.agentCustomerId || data.customer?.agentCustomerId})` : ''}
            </span>
            <span className="app360-pill">
              <strong>PAN:</strong> {resolvedPan}
            </span>
            {(customer.mobileNumber || primaryPerson.mobileNumber) && (
              <span className="app360-pill">
                <strong>Mobile:</strong> {customer.mobileNumber || primaryPerson.mobileNumber}
              </span>
            )}
            {customer.createdAt && (
              <span className="app360-pill">
                <strong>Applied:</strong> {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="app360-metrics-grid">
        <div className="app360-metric-card">
          <div className="app360-metric-icon green">
            <DollarSign size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Loan Amount</span>
            <strong className="app360-metric-value">{formatCurrency(loanAmount)}</strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon blue">
            <Calendar size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Tenure</span>
            <strong className="app360-metric-value">{loanTenure !== undefined && loanTenure !== null ? `${loanTenure} Months` : '—'}</strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon teal">
            <Percent size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Interest Rate</span>
            <strong className="app360-metric-value">{roi !== undefined && roi !== null ? `${roi}%` : '—'}</strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon orange">
            <Briefcase size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Channel</span>
            <strong className="app360-metric-value">{channel}</strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon purple">
            <UserCheck size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Assigned RM</span>
            <strong className="app360-metric-value" title={rmCode ? `${rmName} (${rmCode})` : rmName}>
              {rmName !== '—' ? `${rmName} ${rmCode ? `(${rmCode})` : ''}`.trim() : '—'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicationSummaryHeader;
