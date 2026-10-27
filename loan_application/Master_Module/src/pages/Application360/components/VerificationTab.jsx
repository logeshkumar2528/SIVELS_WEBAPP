import { ShieldCheck, Activity, ClipboardList } from 'lucide-react';

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
  const pdAssessments = Array.isArray(data.pdAssessments) ? data.pdAssessments : [];
  const pdConditions = Array.isArray(data.pdSanctionConditions) ? data.pdSanctionConditions : [];
  const workflowHistory = Array.isArray(data.workflowHistory) ? data.workflowHistory : [];

  // Index healthCheckTypes by ID
  const typeMap = {};
  healthCheckTypes.forEach(t => {
    if (t.healthCheckTypeId) typeMap[t.healthCheckTypeId] = t.checkName || t.name;
    if (t.id) typeMap[t.id] = t.checkName || t.name;
  });

  // Health checks store the checker as an ID. Resolve that ID against the
  // workflow actor details returned by ApplicationFullDetails.
  const checkerMap = {};
  workflowHistory.forEach((entry) => {
    const history = entry?.history || entry;
    const actor = entry?.performedBy || {};
    const userId = history?.performedByUserId;
    const name = actor.name || actor.fullName || history?.performedByName;
    if (userId != null && name) checkerMap[String(userId)] = name;
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
                    <th>Checked By</th>
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
                    const checkerName = hc.checkedByName || hc.checkedBy?.name ||
                      checkerMap[String(hc.checkedByUserId)] || '—';

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
                        <td>{checkerName}</td>
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

      {/* Section 2: Personal Discussion Assessments & Conditions */}
      <div className="app360-content-card app360-mt-4">
        <div className="app360-card-header">
          <div className="app360-card-title">
            <ClipboardList size={18} className="app360-card-icon" />
            <h3>PD Assessments &amp; Conditions ({pdConditions.length})</h3>
          </div>
        </div>
        <div className="app360-card-body">
          {pdAssessments.length === 0 && pdConditions.length === 0 ? (
            <p className="app360-no-records">No PD assessment or sanction conditions available.</p>
          ) : (
            <div className="app360-cards-grid">
              {pdAssessments.map((assessment, idx) => {
                const conditions = pdConditions.filter((condition) => (
                  !condition.pdAssessmentId || condition.pdAssessmentId === assessment.pdAssessmentId
                ));
                const pdPoints = [
                  ['PD Address', assessment.pdAddress],
                  ['Personal Discussion / Site Visit', assessment.personalDiscussionSiteVisit],
                  ['End Use', assessment.endUse],
                  ['Disbursement Transaction', assessment.disbursementTransaction],
                  ['Applicant Profile', assessment.applicantProfile],
                  ['Co-Applicant Profile', assessment.coApplicantProfile],
                  ['Bureau Report', assessment.bureauReport],
                  ['Proposed Collateral', assessment.proposedCollateral],
                  ['Legal & Technical Review', assessment.legalTechnicalReview],
                  ['Strengths', assessment.strengths],
                  ['Concerns', assessment.concerns],
                  ['Recommendation', assessment.recommendation],
                  ['Final Remarks', assessment.finalRemarks],
                ];

                return (
                  <div key={assessment.pdAssessmentId || idx} className="app360-subcard">
                    <div className="app360-subcard-header">
                      <strong>PD Assessment #{idx + 1}</strong>
                      <span className="app360-badge app360-badge-outline">
                        {formatDate(assessment.dateOfPdVisit)}
                      </span>
                    </div>
                    <div className="app360-details-grid app360-mt-2">
                      {pdPoints.map(([label, value]) => (
                        <div key={label} className="app360-detail-item">
                          <span className="label">{label}</span>
                          <span className="value">{value || '—'}</span>
                        </div>
                      ))}
                      <div className="app360-detail-item app360-col-span-2">
                        <span className="label">Sanction Conditions</span>
                        {conditions.length === 0 ? (
                          <span className="value">No conditions recorded</span>
                        ) : (
                          <ol className="app360-pd-conditions">
                            {conditions
                              .sort((a, b) => (a.conditionSequence || 0) - (b.conditionSequence || 0))
                              .map((condition, conditionIndex) => (
                                <li key={condition.pdSanctionConditionId || conditionIndex}>
                                  {condition.conditionText || '—'}
                                </li>
                              ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pdAssessments.length === 0 && pdConditions.length > 0 && (
                <div className="app360-subcard">
                  <div className="app360-subcard-header"><strong>Sanction Conditions</strong></div>
                  <ol className="app360-pd-conditions">
                    {pdConditions.map((condition, idx) => (
                      <li key={condition.pdSanctionConditionId || idx}>{condition.conditionText || '—'}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Field Verification Reports */}
      <div className="app360-content-card app360-mt-4">
        <div className="app360-card-header">
          <div className="app360-card-title">
            <ShieldCheck size={18} className="app360-card-icon" />
            <h3>Field Verification Reports ({fieldVerifications.length})</h3>
          </div>
        </div>
        <div className="app360-card-body">
          {fieldVerifications.length === 0 ? (
          <p className="app360-no-records">NA</p>
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
