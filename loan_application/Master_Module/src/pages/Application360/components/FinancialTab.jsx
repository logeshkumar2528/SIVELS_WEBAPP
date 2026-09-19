import { DollarSign, Landmark, Home, Users, CheckCircle, AlertTriangle } from 'lucide-react';

function formatCurrency(amount) {
  if (amount === undefined || amount === null || amount === '' || isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(amount));
}

export function FinancialTab({ data, masterLookups = {} }) {
  if (!data) return null;

  const employmentList = Array.isArray(data.employmentIncome) ? data.employmentIncome : [];
  const bankList = Array.isArray(data.bankExistingLoans) ? data.bankExistingLoans : [];
  const collateralList = Array.isArray(data.collateral) ? data.collateral : [];
  const referenceList = Array.isArray(data.references) ? data.references : [];

  // Aggregations from real fields only
  const totalGrossIncome = employmentList.reduce((sum, e) => sum + (Number(e.grossMonthlyIncome) || 0), 0);
  const totalNetIncome = employmentList.reduce((sum, e) => sum + (Number(e.netMonthlyIncome) || 0), 0);
  const totalAnnualIncome = employmentList.reduce((sum, e) => sum + (Number(e.grossAnnualIncome) || 0), 0);
  const totalActiveLoans = bankList.reduce((sum, b) => sum + (Number(b.noOfActiveLoans) || 0), 0);
  const totalActiveCreditCards = bankList.reduce((sum, b) => sum + (Number(b.noOfActiveCreditCards) || 0), 0);
  const totalCollateralValue = collateralList.reduce((sum, c) => sum + (Number(c.estimatedValue || c.marketValue) || 0), 0);

  return (
    <div className="app360-tab-pane">
      {/* Top Financial Overview Ribbon */}
      <div className="app360-metrics-grid app360-mb-4">
        <div className="app360-metric-card">
          <div className="app360-metric-icon green">
            <DollarSign size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Total Gross Income (M)</span>
            <strong className="app360-metric-value">{totalGrossIncome > 0 ? formatCurrency(totalGrossIncome) : '—'}</strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon teal">
            <DollarSign size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Total Net Income (M)</span>
            <strong className="app360-metric-value">{totalNetIncome > 0 ? formatCurrency(totalNetIncome) : '—'}</strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon orange">
            <Landmark size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Active Loans & Cards</span>
            <strong className="app360-metric-value">{totalActiveLoans} Loans / {totalActiveCreditCards} Cards</strong>
          </div>
        </div>

        <div className="app360-metric-card">
          <div className="app360-metric-icon purple">
            <Home size={18} />
          </div>
          <div className="app360-metric-details">
            <span className="app360-metric-label">Estimated Collateral</span>
            <strong className="app360-metric-value">{totalCollateralValue > 0 ? formatCurrency(totalCollateralValue) : '—'}</strong>
          </div>
        </div>
      </div>

      <div className="app360-cards-grid">
        {/* Card 1: Declared Bank Accounts */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <Landmark size={18} className="app360-card-icon" />
              <h3>Declared Bank Accounts ({bankList.length})</h3>
            </div>
          </div>
          <div className="app360-card-body">
            {bankList.length === 0 ? (
              <p className="app360-no-records">No bank accounts declared.</p>
            ) : (
              <div className="app360-table-wrapper">
                <table className="app360-table">
                  <thead>
                    <tr>
                      <th>Bank Name</th>
                      <th>Branch</th>
                      <th>Account Number</th>
                      <th>Active Loans</th>
                      <th>Active Cards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankList.map((bank, idx) => {
                      const bankName = bank.bankId ? (masterLookups.banks?.[bank.bankId] || `Bank #${bank.bankId}`) : '—';
                      const branchName = bank.bankBranchId ? (masterLookups.bankBranches?.[bank.bankBranchId] || `Branch #${bank.bankBranchId}`) : '—';

                      return (
                        <tr key={bank.applicationBankExistingLoanDetailsId || bank.bankId || idx}>
                          <td>
                            <strong>{bankName}</strong>
                            {bank.isPrimaryBank && <span className="app360-badge app360-badge-primary app360-block-small">Primary</span>}
                          </td>
                          <td>{branchName}</td>
                          <td>{bank.accountNumber || '—'}</td>
                          <td>{bank.noOfActiveLoans ?? 0}</td>
                          <td>{bank.noOfActiveCreditCards ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Collateral & Property Assets */}
        <div className="app360-content-card">
          <div className="app360-card-header">
            <div className="app360-card-title">
              <Home size={18} className="app360-card-icon" />
              <h3>Collateral & Property Assets ({collateralList.length})</h3>
            </div>
          </div>
          <div className="app360-card-body">
            {collateralList.length === 0 ? (
              <p className="app360-no-records">No collateral property assets registered.</p>
            ) : (
              <div className="app360-sublist">
                {collateralList.map((col, idx) => {
                  const propertyName = col.propertyId 
                    ? (masterLookups.properties?.[col.propertyId] || `Property #${col.propertyId}`) 
                    : (col.propertyName || 'Property Asset');
                  const propertyUsageName = col.propertyUsageId 
                    ? (masterLookups.propertyUsages?.[col.propertyUsageId] || `Usage #${col.propertyUsageId}`) 
                    : (col.propertyUsageName || '—');

                  return (
                    <div key={col.applicationCollateralDetailsId || col.collateralId || idx} className="app360-subcard">
                      <div className="app360-subcard-header">
                        <strong>{propertyName}</strong>
                        <span className="app360-badge app360-badge-primary">{propertyUsageName}</span>
                      </div>
                      <div className="app360-details-grid app360-mt-2">
                        <div className="app360-detail-item app360-col-span-2">
                          <span className="label">Location Address</span>
                          <span className="value">{col.locationAddress || col.address || '—'}</span>
                        </div>
                        <div className="app360-detail-item app360-col-span-2">
                          <span className="label">Estimated Market Value</span>
                          <strong className="value text-success">
                            {formatCurrency(col.estimatedValue ?? col.marketValue)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Personal References */}
      <div className="app360-content-card app360-mt-4">
        <div className="app360-card-header">
          <div className="app360-card-title">
            <Users size={18} className="app360-card-icon" />
            <h3>Personal & Professional References ({referenceList.length})</h3>
          </div>
        </div>
        <div className="app360-card-body">
          {referenceList.length === 0 ? (
            <p className="app360-no-records">No reference contacts provided.</p>
          ) : (
            <div className="app360-sublist app360-sublist-horizontal">
              {referenceList.map((ref, idx) => {
                const relName = ref.relationshipId 
                  ? (masterLookups.relationships?.[ref.relationshipId] || `Relationship #${ref.relationshipId}`) 
                  : (ref.relationshipName || '—');

                return (
                  <div key={ref.applicationReferenceDetailsId || ref.referenceId || idx} className="app360-subcard app360-flex-1">
                    <div className="app360-subcard-header">
                      <strong>{ref.fullName || ref.name || `Reference #${idx + 1}`}</strong>
                      <span className="app360-badge">{relName}</span>
                    </div>
                    <div className="app360-details-grid app360-mt-2">
                      <div className="app360-detail-item">
                        <span className="label">Mobile Number</span>
                        <span className="value">{ref.mobileNumber || ref.phoneNumber || '—'}</span>
                      </div>
                      <div className="app360-detail-item">
                        <span className="label">Relationship</span>
                        <span className="value">{relName}</span>
                      </div>
                      <div className="app360-detail-item app360-col-span-2">
                        <span className="label">Address</span>
                        <span className="value">{ref.address || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinancialTab;
