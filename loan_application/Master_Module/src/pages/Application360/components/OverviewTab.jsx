import { FileText, Users, DollarSign, Calendar, Percent, ShieldCheck, MapPin, ArrowRight, Clock } from 'lucide-react';

function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(amount));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export function OverviewTab({ 
  data, 
  displayApplicationId = '', 
  rawApplicationId = '', 
  resolvedPan = '—',
  masterLookups = {} 
}) {
  if (!data) return null;

  const customer = data.customer || {};
  const product = data.productDetails || (data.productDetailsList && data.productDetailsList[0]) || {};
  const ownership = data.ownership || {};
  const agent = ownership.agent || {};
  const rm = ownership.rm || {};

  // Resolve Names from Real Master Lookups
  const productName = (product.loanProductId && masterLookups.loanProducts?.[product.loanProductId]) || 
    product.loanProductName || 
    product.productName || 
    (product.loanProductId !== undefined ? `Product ID #${product.loanProductId}` : '—');

  const purposeName = (product.loanPurposeId && masterLookups.loanPurposes?.[product.loanPurposeId]) || 
    product.loanPurposeName || 
    product.purpose || 
    (product.loanPurposeId !== undefined ? `Purpose ID #${product.loanPurposeId}` : '—');

  const channel = ownership.source || data.customerSource || customer.customerSource || '—';
  const mainAppId = displayApplicationId || rawApplicationId || '—';

  return (
    <div className="app360-tab-pane">
      <div className="app360-cards-grid">
        {/* Card 1: Application Summary */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <FileText size={18} className="app360-card-icon" />
              <h3>Application Summary</h3>
            </div>
          </div>
          <div className="app360-card-body">
            <div className="app360-details-grid">
              <div className="app360-detail-item">
                <span className="label">Application Reference ID</span>
                <strong className="value">{mainAppId} {rawApplicationId && rawApplicationId !== mainAppId ? `(#${data.agentCustomerId || data.customer?.agentCustomerId})` : ''}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Primary PAN</span>
                <strong className="value">{resolvedPan}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Customer Full Name</span>
                <strong className="value">{customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || data.fullName || '—'}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Primary Mobile Number</span>
                <span className="value">{customer.mobileNumber || data.mobileNumber || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Primary Email</span>
                <span className="value">{customer.email || data.email || '—'}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Status Code</span>
                <strong className="value">{customer.status !== undefined ? `Status ${customer.status}` : (data.status !== undefined ? `Status ${data.status}` : '—')}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Created Date</span>
                <span className="value">{formatDate(customer.createdAt || data.createdAt)}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Last Modified Date</span>
                <span className="value">{formatDate(customer.modifiedAt || customer.updatedAt || data.updatedAt || data.modifiedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Loan & Product Specification */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <DollarSign size={18} className="app360-card-icon" />
              <h3>Loan & Product Specification</h3>
            </div>
          </div>
          <div className="app360-card-body">
            <div className="app360-details-grid">
              <div className="app360-detail-item">
                <span className="label">Loan Product</span>
                <strong className="value">{productName}</strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Loan Purpose</span>
                <span className="value">{purposeName}</span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Loan Amount</span>
                <strong className="value text-success">
                  {formatCurrency(product.loanAmount ?? customer.loanAmount ?? data.loanAmount)}
                </strong>
              </div>
              <div className="app360-detail-item">
                <span className="label">Loan Tenure</span>
                <span className="value">
                  {(product.loanTenure ?? customer.loanTenure ?? product.tenure ?? customer.tenure ?? data.tenure) !== undefined 
                    ? `${product.loanTenure ?? customer.loanTenure ?? product.tenure ?? customer.tenure ?? data.tenure} Months` 
                    : '—'}
                </span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Rate of Interest (ROI)</span>
                <span className="value">
                  {(product.roi ?? customer.roi ?? product.rateOfInterest ?? customer.rateOfInterest ?? data.rateOfInterest) !== undefined 
                    ? `${product.roi ?? customer.roi ?? product.rateOfInterest ?? customer.rateOfInterest ?? data.rateOfInterest}%` 
                    : '—'}
                </span>
              </div>
              <div className="app360-detail-item">
                <span className="label">Distance from Branch</span>
                <span className="value">
                  {product.distanceFromBranch !== undefined && product.distanceFromBranch !== null ? `${product.distanceFromBranch} km` : '—'}
                </span>
              </div>
              <div className="app360-detail-item">
                <span className="label">No. of Co-Applicants</span>
                <span className="value">{product.noOfCoApplicants ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Ownership & Hierarchy */}
      <div className="app360-content-card app360-mt-4">
        <div className="app360-card-header">
          <div className="app360-card-title">
            <Users size={18} className="app360-card-icon" />
            <h3>Sourcing & Relationship Ownership Hierarchy</h3>
          </div>
          <span className="app360-badge app360-badge-outline">Source: {channel}</span>
        </div>
        <div className="app360-card-body">
          <div className="app360-hierarchy-flow">
            {/* Agent Node */}
            <div className="app360-hierarchy-node">
              <div className="app360-node-badge">Sourcing Agent</div>
              <div className="app360-node-card">
                <h4>{agent.agentName || data.agentName || customer.agentName || '—'}</h4>
                <div className="app360-node-info">
                  <span><strong>Agent ID:</strong> {agent.agentId ?? data.agentId ?? '—'}</span>
                </div>
              </div>
            </div>

            <div className="app360-hierarchy-arrow">
              <ArrowRight size={20} />
            </div>

            {/* RM Node */}
            <div className="app360-hierarchy-node">
              <div className="app360-node-badge">Relationship Manager (RM)</div>
              <div className="app360-node-card">
                <h4>{rm.rmName || data.rmName || customer.rmName || '—'}</h4>
                <div className="app360-node-info">
                  <span><strong>RM Code:</strong> {rm.rmCode || data.rmCode || '—'}</span>
                  <span><strong>RM ID:</strong> {rm.rmId ?? data.rmId ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
