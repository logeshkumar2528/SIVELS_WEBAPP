import { Calculator, FileSpreadsheet, Percent, DollarSign, CheckCircle } from 'lucide-react';

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
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function EligibilityTab({ data, masterLookups = {} }) {
  if (!data) return null;

  // Extract All Eligibility Assessments (supporting both wrapper and flat structures)
  const rawAssessments = Array.isArray(data.currentEligibilityAssessments) 
    ? data.currentEligibilityAssessments 
    : (data.currentEligibilityAssessments ? [data.currentEligibilityAssessments] : (Array.isArray(data.eligibilityAssessments) ? data.eligibilityAssessments : []));

  // Normalized Assessment Items
  const normalizedAssessments = rawAssessments.map((item, idx) => {
    const assessment = item.assessment || item;
    const assessmentMethod = item.assessmentMethod || {};
    const methodName = assessmentMethod.methodName || 
      assessment.methodName || 
      (assessment.assessmentMethodId && masterLookups.assessmentMethods?.[assessment.assessmentMethodId]) || 
      'Standard Underwriting';

    return {
      index: idx,
      assessment,
      assessmentMethod,
      methodName,
      maxEligible: assessment.maximumEligibleLoanAmount,
      recommended: assessment.recommendedLoanAmount,
      requested: assessment.requestedLoanAmount,
      eligibleEmi: assessment.eligibleEMI,
      foirApplied: assessment.foirPercentApplied,
      actualFoir: assessment.actualFOIR,
      totalIncome: assessment.totalConsideredIncome,
      existingEmi: assessment.existingEMI,
      proposedRoi: assessment.proposedROI,
      proposedTenure: assessment.proposedTenureMonths,
      emiFactor: assessment.emiFactor,
      status: assessment.status,
      calculatedAt: assessment.calculatedAt,
      version: assessment.calculationVersion,
      applicantSequence: assessment.applicantSequence ?? item.applicantSequence ?? 0,
    };
  });

  // Primary active assessment for ribbon
  const primaryAssessment = normalizedAssessments[0] || {};

  // Extract Flat RTR Assessment
  const rawRtr = data.currentRTRAssessments || data.rtrAssessments;
  const rtr = Array.isArray(rawRtr) ? rawRtr[0] : (rawRtr || {});

  // Extract RTR Loan Details
  const rtrLoans = Array.isArray(data.rtrLoanDetails) ? data.rtrLoanDetails : (Array.isArray(data.rtrLoans) ? data.rtrLoans : []);

  return (
    <div className="app360-tab-pane">
      {/* Top Metrics Ribbon */}
      <div className="app360-metrics-grid app360-mb-4">
        <div className="app360-metric-card">
          <div className="app360-metric-icon green">
            <DollarSign size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Max Eligible Loan</span>
            <strong className="app360-metric-value">
              {formatCurrency(primaryAssessment.maxEligible)}
            </strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon blue">
            <Calculator size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Recommended Loan</span>
            <strong className="app360-metric-value">
              {formatCurrency(primaryAssessment.recommended)}
            </strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon teal">
            <Percent size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Eligible EMI</span>
            <strong className="app360-metric-value">
              {formatCurrency(primaryAssessment.eligibleEmi)}
            </strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon purple">
            <FileSpreadsheet size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">RTR Final Eligibility</span>
            <strong className="app360-metric-value">
              {formatCurrency(rtr.finalLoanEligibility)}
            </strong>
          </div>
        </div>
      </div>

      <div className="app360-cards-grid">
        {/* Card 1: Core Eligibility Assessment Calculation */}
        {normalizedAssessments.length === 0 ? (
          <div className="app360-content-card">
            <div className="app360-card-header">
              <div className="app360-card-title">
                <Calculator size={18} className="app360-card-icon" />
                <h3>Eligibility Assessment Details</h3>
              </div>
            </div>
            <div className="app360-card-body">
              <p className="app360-no-records">No eligibility assessment calculation record found.</p>
            </div>
          </div>
        ) : (
          normalizedAssessments.map(item => (
            <div key={item.index} className="app360-content-card">
              <div className="app360-card-header">
                <div className="app360-card-title">
                  <Calculator size={18} className="app360-card-icon" />
                  <h3>Eligibility Assessment ({item.methodName})</h3>
                </div>
                {item.status && (
                  <span className="app360-badge app360-badge-primary">
                    {item.status}
                  </span>
                )}
              </div>
              <div className="app360-card-body">
                <div className="app360-details-grid">
                  <div className="app360-detail-item">
                    <span className="label">Assessment Method</span>
                    <strong className="value">{item.methodName}</strong>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Assessment Status</span>
                    <span className="value">{item.status || '—'}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Total Considered Income</span>
                    <span className="value">{formatCurrency(item.totalIncome)}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Existing EMI Considered</span>
                    <span className="value">{formatCurrency(item.existingEmi)}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">FOIR % Applied</span>
                    <span className="value">{item.foirApplied !== undefined && item.foirApplied !== null ? `${item.foirApplied}%` : '—'}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Actual FOIR %</span>
                    <span className="value">{item.actualFoir !== undefined && item.actualFoir !== null ? `${item.actualFoir}%` : '—'}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Requested Loan Amount</span>
                    <span className="value">{formatCurrency(item.requested)}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Eligible Monthly EMI</span>
                    <strong className="value text-success">{formatCurrency(item.eligibleEmi)}</strong>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Proposed ROI</span>
                    <span className="value">{item.proposedRoi !== undefined && item.proposedRoi !== null ? `${item.proposedRoi}%` : '—'}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Proposed Tenure</span>
                    <span className="value">{item.proposedTenure !== undefined && item.proposedTenure !== null ? `${item.proposedTenure} Months` : '—'}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">EMI Factor</span>
                    <span className="value">{item.emiFactor ?? '—'}</span>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Maximum Eligible Loan Amount</span>
                    <strong className="value text-success">{formatCurrency(item.maxEligible)}</strong>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Recommended Loan Amount</span>
                    <strong className="value text-success">{formatCurrency(item.recommended)}</strong>
                  </div>
                  <div className="app360-detail-item">
                    <span className="label">Calculated At</span>
                    <span className="value">{formatDate(item.calculatedAt)}</span>
                  </div>
                  {item.version !== undefined && (
                    <div className="app360-detail-item">
                      <span className="label">Calculation Version</span>
                      <span className="value">v{item.version}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Card 2: RTR Assessment Overview */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <FileSpreadsheet size={18} className="app360-card-icon" />
              <h3>Repayment Track Record (RTR) Assessment</h3>
            </div>
          </div>
          <div className="app360-card-body">
            {!rtr || Object.keys(rtr).length === 0 ? (
              <p className="app360-no-records">No RTR assessment summary recorded.</p>
            ) : (
              <div className="app360-details-grid">
                <div className="app360-detail-item">
                  <span className="label">Paid Amount</span>
                  <strong className="value text-success">{formatCurrency(rtr.paidAmount)}</strong>
                </div>
                <div className="app360-detail-item">
                  <span className="label">Applicable EMI Multiplier</span>
                  <strong className="value">{rtr.applicableEMIMultiplier !== undefined && rtr.applicableEMIMultiplier !== null ? `${rtr.applicableEMIMultiplier}x` : '—'}</strong>
                </div>
                <div className="app360-detail-item">
                  <span className="label">Max Top-Up Amount</span>
                  <strong className="value text-success">{formatCurrency(rtr.maxTopUpAmount)}</strong>
                </div>
                <div className="app360-detail-item">
                  <span className="label">Assessed Income</span>
                  <span className="value">{formatCurrency(rtr.assessedIncome)}</span>
                </div>
                <div className="app360-detail-item">
                  <span className="label">EMI Amount</span>
                  <span className="value">{formatCurrency(rtr.emiAmount)}</span>
                </div>
                <div className="app360-detail-item">
                  <span className="label">EMI Amount Factor</span>
                  <span className="value">{rtr.emiAmountFactor ?? '—'}</span>
                </div>
                <div className="app360-detail-item app360-col-span-2">
                  <span className="label">Final Loan Eligibility</span>
                  <strong className="value text-success">{formatCurrency(rtr.finalLoanEligibility)}</strong>
                </div>
                <div className="app360-detail-item">
                  <span className="label">RTR Calculated Date</span>
                  <span className="value">{formatDate(rtr.createdAt)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: RTR Loan Details Table */}
      <div className="app360-content-card app360-mt-4">
        <div className="app360-card-header">
          <div className="app360-card-title">
            <FileSpreadsheet size={18} className="app360-card-icon" />
            <h3>RTR Loan Details ({rtrLoans.length})</h3>
          </div>
        </div>
        <div className="app360-card-body">
          {rtrLoans.length === 0 ? (
            <p className="app360-no-records">No RTR loan line records available.</p>
          ) : (
            <div className="app360-table-wrapper">
              <table className="app360-table">
                <thead>
                  <tr>
                    <th>Lender Name</th>
                    <th>Sanction Amount</th>
                    <th>Current POS</th>
                    <th>EMI Start Date</th>
                    <th>EMI Amount</th>
                    <th>MOB (Months on Book)</th>
                    <th>OD Count</th>
                    <th>Bounce Count</th>
                    <th>Selected for RTR</th>
                  </tr>
                </thead>
                <tbody>
                  {rtrLoans.map((loan, idx) => (
                    <tr key={loan.applicationCalculationRTRLoanDetailsId || loan.rtrLoanDetailId || idx}>
                      <td>
                        <strong>{loan.lenderName || '—'}</strong>
                      </td>
                      <td>{formatCurrency(loan.sanctionAmount)}</td>
                      <td>{formatCurrency(loan.currentPOS)}</td>
                      <td>{formatDate(loan.emiStartDate)}</td>
                      <td>{formatCurrency(loan.emiAmount)}</td>
                      <td>{loan.mob !== undefined && loan.mob !== null ? `${loan.mob} Mos` : '—'}</td>
                      <td>{loan.odCount ?? 0}</td>
                      <td>{loan.bounceCount ?? 0}</td>
                      <td>
                        <span className={`app360-badge ${loan.isSelectedForRTR ? 'app360-badge-primary' : ''}`}>
                          {loan.isSelectedForRTR ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EligibilityTab;
