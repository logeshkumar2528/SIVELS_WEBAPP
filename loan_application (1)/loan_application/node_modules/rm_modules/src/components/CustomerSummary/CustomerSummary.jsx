import { memo } from 'react';
import iconMap from '../../config/iconMap';
import StatusBadge from '../StatusBadge/StatusBadge';
import './CustomerSummary.css';

const CustomerSummary = memo(function CustomerSummary({ customer }) {
  if (!customer) return null;
  const PhoneIcon = iconMap['Phone'];
  const FileTextIcon = iconMap['FileText'];
  const MessageSquareIcon = iconMap['MessageSquare'] || iconMap['FileText'];

  return (
    <div className="cs-card">
      {/* 1. Header Section */}
      <div className="cs-card-header">
        <div className="flex-align-center gap-2">
          <span className="cs-header-dot" />
          <h3 className="cs-header-title">Customer Summary</h3>
        </div>
        {customer.status && <StatusBadge status={customer.status} />}
      </div>

      {/* 2. Customer Hero Card */}
      <div className="cs-hero-section">
        <div className="cs-avatar-box">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer.name || 'Ramesh Kumar')}&background=0f7a4c&color=ffffff&size=128&bold=true`}
            alt={customer.name || 'Customer'}
            className="cs-avatar-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="%230F7A4C"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
            }}
          />
        </div>

        <div className="cs-hero-info">
          <h2 className="cs-customer-name">{customer.name || 'Ramesh Kumar'}</h2>
          
          <div className="cs-contact-line">
            {PhoneIcon && <PhoneIcon size={12} className="cs-contact-icon" />}
            <span className="cs-phone-num">+91 {customer.mobile || '98765 43210'}</span>
          </div>

          <div className="cs-badge-row">
            <span className="cs-meta-tag">{customer.age || '32 Yrs'} • {customer.gender || 'Male'}</span>
            <span className="cs-loan-tag">{customer.loanType || 'Business Loan'}</span>
          </div>
        </div>
      </div>

      {/* 3. Metric Tiles Grid */}
      <div className="cs-metrics-grid">
        <div className="cs-metric-card cs-metric-card--green">
          <span className="cs-metric-label">Loan Requested</span>
          <span className="cs-metric-val cs-val-green">{customer.loanAmount || '₹ 1,50,000'}</span>
        </div>
        <div className="cs-metric-card cs-metric-card--blue">
          <span className="cs-metric-label">Monthly Income</span>
          <span className="cs-metric-val">{customer.income || '₹ 35k - 50k'}</span>
        </div>
      </div>

      {/* 4. Agent Submission Section Title */}
      <div className="cs-sub-header">
        {FileTextIcon && <FileTextIcon size={13} className="cs-sub-icon" />}
        <span>Submitted Information (by Agent)</span>
      </div>

      {/* 5. Key-Value Info Grid */}
      <div className="cs-info-table">
        <div className="cs-table-row">
          <span className="cs-tr-k">Occupation</span>
          <span className="cs-tr-v">{customer.occupation || 'Business'}</span>
        </div>

        <div className="cs-table-row">
          <span className="cs-tr-k">Loan Purpose</span>
          <span className="cs-tr-v">{customer.loanPurpose || 'Business Expansion'}</span>
        </div>

        {customer.address && (
          <div className="cs-table-row">
            <span className="cs-tr-k">Area / Branch</span>
            <span className="cs-tr-v">{customer.address}</span>
          </div>
        )}

        {customer.aadhaarNo && (
          <div className="cs-table-row">
            <span className="cs-tr-k">Aadhaar Card</span>
            <span className="cs-tr-v font-mono">{customer.aadhaarNo}</span>
          </div>
        )}

        {customer.agentName && (
          <div className="cs-table-row">
            <span className="cs-tr-k">Field Agent</span>
            <span className="cs-tr-v">{customer.agentName}</span>
          </div>
        )}
      </div>

      {/* 6. Agent Remarks Quote Block */}
      <div className="cs-quote-block">
        <div className="cs-quote-title">
          {MessageSquareIcon && <MessageSquareIcon size={11} />}
          <span>Remarks by Agent</span>
        </div>
        <p className="cs-quote-text">"{customer.agentRemarks || 'Customer interested in business loan.'}"</p>
      </div>
    </div>
  );
});

export default CustomerSummary;
