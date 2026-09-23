import React, { useMemo } from 'react';
import { resolveApplicantName, buildApplicationDisplayId } from '../../pages/applicationWizard/flowUtils';
import { resolveApplicationOwnership } from '../../utils/ownershipHelper';
import { formatDate } from '../../utils/dateHelper';
import './ApplicationTopSummary.css';

export default function ApplicationTopSummary({
  appData = {},
  appId = '',
  isHydrating = false,
}) {
  // 1. Applicant Name
  const resolvedApplicantName = useMemo(() => resolveApplicantName(appData), [appData]);
  const applicantDisplay = isHydrating && resolvedApplicantName === 'Applicant' ? 'Loading...' : resolvedApplicantName;

  // 2. Application Display ID
  const applicationDisplayId = useMemo(() => {
    return buildApplicationDisplayId(appData, appId) || appId || '—';
  }, [appData, appId]);

  // 3. Branch
  const branchDisplay = useMemo(() => {
    const rawBranch =
      appData?.branch ||
      appData?.Branch ||
      appData?.addressDetails?.applicant?.city ||
      appData?.addressDetails?.applicant?.City ||
      appData?.raw?.branch ||
      appData?.raw?.Branch ||
      '';
    const trimmed = String(rawBranch).trim();
    // Do NOT use hardcoded 'Chennai Main Branch'. If no valid branch exists, show '—'
    return trimmed || '—';
  }, [appData]);

  // 4. Submitted Date
  const submittedDisplay = useMemo(() => {
    const rawDate =
      appData?.createdDate ||
      appData?.CreatedDate ||
      appData?.applicationDate ||
      appData?.ApplicationDate ||
      appData?.createdAt ||
      appData?.CreatedAt ||
      appData?.submittedAt ||
      appData?.SubmittedAt ||
      '';
    return formatDate(rawDate, 'Not submitted');
  }, [appData]);

  // 5. RM & 6. Agent
  const { rmDisplay, agentDisplay } = useMemo(() => {
    const ownership = resolveApplicationOwnership(appData);

    // Resolve RM Name & ID
    const rawRmName =
      (ownership.rmName && ownership.rmName !== '—' ? ownership.rmName : '') ||
      appData?.rmName ||
      appData?.RmName ||
      appData?.RMName ||
      '';
    const rawRmCode =
      appData?.rmCode ||
      appData?.RmCode ||
      appData?.RMCode ||
      appData?.rmEmployeeId ||
      appData?.employeeId ||
      '';
    const rawRmId = ownership.rmId || appData?.rmId || appData?.RmId || appData?.RMId;
    const resolvedRmCode = rawRmCode
      ? String(rawRmCode).trim()
      : (rawRmId ? (String(rawRmId).startsWith('RM') ? String(rawRmId) : `RM${rawRmId}`) : '');

    let finalRm = '—';
    if (rawRmName && resolvedRmCode) {
      finalRm = `${rawRmName} | ${resolvedRmCode}`;
    } else if (rawRmName) {
      finalRm = rawRmName;
    } else if (resolvedRmCode) {
      finalRm = resolvedRmCode;
    }

    // Resolve Agent
    const isDirectRm = Boolean(
      ownership.isDirectRm ||
      (!ownership.agentId && (!ownership.agentName || ownership.agentName === '—' || ownership.agentName === 'Direct (RM)'))
    );

    let finalAgent = 'Direct (RM)';
    if (!isDirectRm) {
      const rawAgentName =
        (ownership.agentName && ownership.agentName !== '—' && ownership.agentName !== 'Direct (RM)' ? ownership.agentName : '') ||
        appData?.agentName ||
        appData?.AgentName ||
        '';
      const rawAgentCode = appData?.agentCode || appData?.AgentCode || '';
      const rawAgentId = ownership.agentId || appData?.agentId || appData?.AgentId;
      const resolvedAgentCode = rawAgentCode
        ? String(rawAgentCode).trim()
        : (rawAgentId ? (String(rawAgentId).startsWith('AG') ? String(rawAgentId) : `AG${rawAgentId}`) : '');

      if (rawAgentName && resolvedAgentCode) {
        finalAgent = `${rawAgentName} | ${resolvedAgentCode}`;
      } else if (rawAgentName) {
        finalAgent = rawAgentName;
      } else if (resolvedAgentCode) {
        finalAgent = resolvedAgentCode;
      }
    }

    return { rmDisplay: finalRm, agentDisplay: finalAgent };
  }, [appData]);

  return (
    <div className="aw-top-summary-card">
      {/* Row 1 */}
      <div className="aw-summary-cell">
        <span className="aw-summary-label">Applicant :</span>
        <span className="aw-summary-value highlight" title={applicantDisplay}>{applicantDisplay}</span>
      </div>
      <div className="aw-summary-cell">
        <span className="aw-summary-label">App ID :</span>
        <span className="aw-summary-value" title={applicationDisplayId}>{applicationDisplayId}</span>
      </div>
      <div className="aw-summary-cell">
        <span className="aw-summary-label">Branch :</span>
        <span className="aw-summary-value" title={branchDisplay}>{branchDisplay}</span>
      </div>

      {/* Row 2 */}
      <div className="aw-summary-cell">
        <span className="aw-summary-label">Submitted :</span>
        <span className="aw-summary-value" title={submittedDisplay}>{submittedDisplay}</span>
      </div>
      <div className="aw-summary-cell">
        <span className="aw-summary-label">RM :</span>
        <span className="aw-summary-value" title={rmDisplay}>{rmDisplay}</span>
      </div>
      <div className="aw-summary-cell">
        <span className="aw-summary-label">Agent :</span>
        <span className="aw-summary-value" title={agentDisplay}>{agentDisplay}</span>
      </div>
    </div>
  );
}
