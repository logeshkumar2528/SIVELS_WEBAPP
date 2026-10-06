import React, { useMemo, useState, useEffect } from 'react';
import { resolveApplicantName } from '../../pages/applicationWizard/flowUtils';
import { resolveApplicationOwnership } from '../../utils/ownershipHelper';
import { formatDate } from '../../utils/dateHelper';
import rmCustomerService from '../../services/rmCustomerService';
import './ApplicationTopSummary.css';

export default function ApplicationTopSummary({
  appData = {},
  appId = '',
  isHydrating = false,
}) {
  // 1. Applicant Name
  const resolvedApplicantName = useMemo(() => resolveApplicantName(appData), [appData]);
  const applicantDisplay = isHydrating && resolvedApplicantName === 'Applicant' ? 'Loading...' : resolvedApplicantName;

  // 2. Customer Code Display
  const customerCodeDisplay = useMemo(() => {
    const rawCode =
      appData?.customer?.customerCode ||
      appData?.customer?.CustomerCode ||
      appData?.customerCode ||
      appData?.CustomerCode ||
      appData?.raw?.customer?.customerCode ||
      appData?.raw?.customer?.CustomerCode ||
      '';
    const trimmed = String(rawCode).trim();
    return trimmed || '—';
  }, [appData]);

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
    const resolvedRmCode = rawRmCode ? String(rawRmCode).trim() : '';

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
      const resolvedAgentCode = rawAgentCode ? String(rawAgentCode).trim() : '';

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

  // 7. Returned Application Status Detection (Status 6)
  const isReturnedApplication = useMemo(() => {
    const rawStatus =
      appData?.rawStatus !== undefined && appData?.rawStatus !== null
        ? Number(appData.rawStatus)
        : (appData?.rawStatusCode !== undefined && appData?.rawStatusCode !== null
            ? Number(appData.rawStatusCode)
            : (appData?.customer?.status !== undefined && appData?.customer?.status !== null
                ? Number(appData.customer.status)
                : (appData?.customer?.Status !== undefined && appData?.customer?.Status !== null
                    ? Number(appData.customer.Status)
                    : (appData?.raw?.customer?.status !== undefined && appData?.raw?.customer?.status !== null
                        ? Number(appData.raw?.customer?.status)
                        : (appData?.raw?.customer?.Status !== undefined && appData?.raw?.customer?.Status !== null
                            ? Number(appData.raw?.customer?.Status)
                            : (appData?.status === 'Returned' || appData?.status === 6 ? 6 : null))))));
    return rawStatus === 6;
  }, [appData]);

  // 8. Effective Application ID for History Fetch
  const effectiveAppId = useMemo(() => {
    return (
      appData?.agentCustomerId ||
      appData?.AgentCustomerId ||
      appData?.id ||
      appData?.customer?.agentCustomerId ||
      appData?.customer?.AgentCustomerId ||
      appId ||
      ''
    );
  }, [appData, appId]);

  // 9. Workflow History State for Returned Applications
  const [workflowHistory, setWorkflowHistory] = useState([]);

  useEffect(() => {
    let active = true;
    if (isReturnedApplication && effectiveAppId) {
      rmCustomerService.getApplicationWorkflowHistory(effectiveAppId)
        .then((history) => {
          if (active && Array.isArray(history)) {
            setWorkflowHistory(history);
          }
        })
        .catch((err) => {
          console.warn('[ApplicationTopSummary] Could not load workflow history:', err?.message);
        });
    }
    return () => {
      active = false;
    };
  }, [isReturnedApplication, effectiveAppId]);

  // 10. Deterministic Latest Return Record Selection
  const latestReturnRecord = useMemo(() => {
    if (!Array.isArray(workflowHistory) || workflowHistory.length === 0) return null;

    const returnRecords = workflowHistory.filter((item) => {
      const action = String(item.actionType || item.ActionType || '').toLowerCase();
      const toStatus = Number(item.toStatus || item.ToStatus);
      return action.includes('return') || toStatus === 6;
    });

    if (returnRecords.length === 0) {
      for (let i = workflowHistory.length - 1; i >= 0; i--) {
        if (workflowHistory[i]?.remarks || workflowHistory[i]?.Remarks) {
          return workflowHistory[i];
        }
      }
      return null;
    }

    returnRecords.sort((a, b) => {
      const idA = Number(a.applicationWorkflowHistoryId ?? a.historyId ?? a.HistoryId ?? 0);
      const idB = Number(b.applicationWorkflowHistoryId ?? b.historyId ?? b.HistoryId ?? 0);
      if (idA && idB && idA !== idB) return idB - idA;

      const timeA = new Date(a.createdAt || a.CreatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.CreatedAt || 0).getTime();
      return timeB - timeA;
    });

    return returnRecords[0] || null;
  }, [workflowHistory]);

  // 11. Dynamic Person Name Resolution based on applicantSequence
  const resolvedTargetPerson = useMemo(() => {
    if (!latestReturnRecord) return null;
    const rawSeq = latestReturnRecord.applicantSequence ?? latestReturnRecord.ApplicantSequence;
    if (rawSeq === null || rawSeq === undefined || rawSeq === '') {
      return null;
    }

    const seq = Number(rawSeq);
    if (isNaN(seq)) return null;

    // Sequence 0: Primary Applicant
    if (seq === 0) {
      const pers =
        appData?.registration?.personalInformation?.applicant ||
        appData?.sections?.personalInformation?.applicant ||
        appData?.personalInformation?.applicant ||
        appData?.raw?.personalInformation?.[0] ||
        appData?.customer ||
        {};
      const nameParts = [
        pers.firstName ?? pers.FirstName,
        pers.middleName ?? pers.MiddleName,
        pers.lastName ?? pers.LastName,
      ].filter(Boolean).join(' ');
      const name =
        nameParts ||
        pers.fullName ||
        pers.FullName ||
        pers.customerName ||
        pers.CustomerName ||
        appData?.customerName ||
        resolveApplicantName(appData) ||
        'Primary Applicant';
      return `Primary Applicant — ${name}`;
    }

    // Sequence >= 1: Co-Applicant N
    const coList =
      appData?.registration?.personalInformation?.coApplicants ||
      appData?.sections?.personalInformation?.coApplicants ||
      appData?.personalInformation?.coApplicants ||
      (Array.isArray(appData?.raw?.personalInformation) ? appData.raw.personalInformation.slice(1) : []) ||
      [];

    let matchedCo = coList.find((co) => {
      const coSeq = co?.applicantSequence ?? co?.ApplicantSequence ?? co?.sequence ?? co?.Sequence;
      return coSeq !== undefined && coSeq !== null && Number(coSeq) === seq;
    });

    if (!matchedCo && coList[seq - 1]) {
      matchedCo = coList[seq - 1];
    }

    if (matchedCo) {
      const nameParts = [
        matchedCo.firstName ?? matchedCo.FirstName,
        matchedCo.middleName ?? matchedCo.MiddleName,
        matchedCo.lastName ?? matchedCo.LastName,
      ].filter(Boolean).join(' ');
      const coName =
        nameParts ||
        matchedCo.fullName ||
        matchedCo.FullName ||
        matchedCo.name ||
        matchedCo.customerName ||
        `Co-Applicant ${seq}`;
      return `Co-Applicant ${seq} — ${coName}`;
    }

    return `Co-Applicant ${seq}`;
  }, [latestReturnRecord, appData]);

  // 12. Remarks resolution
  const resolvedRemarks = useMemo(() => {
    const rawRemarks = latestReturnRecord?.remarks || latestReturnRecord?.Remarks;
    if (rawRemarks && String(rawRemarks).trim()) {
      return String(rawRemarks).trim();
    }
    return 'Please review the application and make necessary corrections before resubmitting.';
  }, [latestReturnRecord]);

  return (
    <div className="aw-top-summary-container">
      <div className="aw-top-summary-card">
        {/* Row 1 */}
        <div className="aw-summary-cell">
          <span className="aw-summary-label">Applicant :</span>
          <span className="aw-summary-value highlight" title={applicantDisplay}>{applicantDisplay}</span>
        </div>
        <div className="aw-summary-cell">
          <span className="aw-summary-label">Customer Code :</span>
          <span className="aw-summary-value" title={customerCodeDisplay}>{customerCodeDisplay}</span>
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

      {isReturnedApplication && (
        <div className="aw-return-guidance-banner">
          <div className="aw-return-guidance-header">
            <span className="aw-return-guidance-badge">Application Returned by Back Office</span>
          </div>
          <div className="aw-return-guidance-body">
            {resolvedTargetPerson && (
              <div className="aw-return-guidance-row">
                <span className="aw-return-guidance-label">Correction For:</span>
                <span className="aw-return-guidance-target">{resolvedTargetPerson}</span>
              </div>
            )}
            <div className="aw-return-guidance-row">
              <span className="aw-return-guidance-label">Reason:</span>
              <span className="aw-return-guidance-reason">{resolvedRemarks}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
