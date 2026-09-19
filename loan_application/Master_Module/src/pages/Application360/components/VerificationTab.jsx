import { ShieldCheck, Activity, CheckCircle, Clock } from 'lucide-react';

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

export function VerificationTab({ data }) {
  if (!data) return null;

  const healthChecks = Array.isArray(data.healthChecks) ? data.healthChecks : [];
  const healthCheckTypes = Array.isArray(data.healthCheckTypes) ? data.healthCheckTypes : [];
  const fieldVerifications = Array.isArray(data.fieldVerification) ? data.fieldVerification : [];

  // Index healthCheckTypes by ID
  const typeMap = {};
  healthCheckTypes.forEach(t => {
    if (t.healthCheckTypeId) typeMap[t.healthCheckTypeId] = t.checkName || t.name;
    if (t.id) typeMap[t.id] = t.checkName || t.name;
  });

  return (
    <div className="app360-tab-pane">
      {/* Section 1: Health Checks & Rule Validations */}
      <div className="app360-content-card">
        <div className="app360-card-header">
          <div className="app360-card-title">
            <Activity size={18} className="app360-card-icon" />
            <h3>Health Checks ({healthChecks.length})</h3>
          </div>
        </div>
        <div className="app360-card-body">
          {healthChecks.length === 0 ? (
            <p className="app360-no-records">No health check records available for this application.</p>
          ) : (
            <div className="app360-table-wrapper">
              <table className="app360-table">
                <thead>
                  <tr>
                    <th>Check Name</th>
                    <th>Applicant</th>
                    <th>Status</th>
                    <th>Date of Check</th>
                    <th>Checked By Role</th>
                    <th>User ID</th>
                    <th>Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {healthChecks.map((hc, idx) => {
                    const checkName = (hc.healthCheckTypeId && typeMap[hc.healthCheckTypeId]) || 
                      hc.checkName || 
                      (hc.healthCheckTypeId ? `Health Check #${hc.healthCheckTypeId}` : `Check #${idx + 1}`);
                    const seq = hc.applicantSequence ?? 0;
                    const applicantLabel = seq === 0 ? 'Primary Applicant' : `Co-Applicant ${seq}`;
                    const statusText = hc.checkStatus || hc.status || '—';

                    return (
                      <tr key={hc.applicationHealthCheckDetailsId || hc.healthCheckId || idx}>
                        <td>
                          <strong>{checkName}</strong>
                        </td>
                        <td>
                          <span className="app360-badge app360-badge-outline">{applicantLabel}</span>
                        </td>
                        <td>
                          <span className="app360-badge app360-badge-primary">
                            {statusText}
                          </span>
                        </td>
                        <td>{formatDate(hc.dateOfCheck || hc.checkedAt || hc.createdAt)}</td>
                        <td>{hc.checkedByRole || '—'}</td>
                        <td>{hc.checkedByUserId ?? '—'}</td>
                        <td>
                          <span className="app360-text-remarks">{hc.findings || hc.remarks || '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Field Verification Reports */}
      <div className="app360-content-card app360-mt-4">
        <div className="app360-card-header">
          <div className="app360-card-title">
            <ShieldCheck size={18} className="app360-card-icon" />
            <h3>Field Verification Reports ({fieldVerifications.length})</h3>
          </div>
        </div>
        <div className="app360-card-body">
          {fieldVerifications.length === 0 ? (
            <p className="app360-no-records">No field verification records available.</p>
          ) : (
            <div className="app360-cards-grid">
              {fieldVerifications.map((fi, idx) => (
                <div key={fi.fieldVerificationId || idx} className="app360-subcard">
                  <div className="app360-subcard-header">
                    <strong>{fi.verificationType || fi.type || `Field Inspection #${idx + 1}`}</strong>
                    <span className="app360-badge">
                      {fi.positiveNegativeStatus || fi.status || '—'}
                    </span>
                  </div>
                  <div className="app360-details-grid app360-mt-2">
                    <div className="app360-detail-item">
                      <span className="label">Verification Officer / Agent</span>
                      <span className="value">{fi.agentName || fi.officerName || '—'}</span>
                    </div>
                    <div className="app360-detail-item">
                      <span className="label">Report Date</span>
                      <span className="value">{formatDate(fi.reportDate || fi.verificationDate || fi.createdAt)}</span>
                    </div>
                    <div className="app360-detail-item app360-col-span-2">
                      <span className="label">Remarks / Findings</span>
                      <p className="app360-text-remarks">{fi.remarks || fi.reportSummary || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VerificationTab;
