import { extractWorkflowStatus } from '../../../../Core/src/utils/applicationWorkflowStatus';
import { resolveApplicationOwnership } from '../../../../Core/src/utils/ownershipHelper';
import { RM_WORKFLOW_CODES } from './rmWorkflowStatus';

const workflowCache = new Map();
const WORKFLOW_CACHE_TTL_MS = 15_000;

function unwrapCustomerResponse(response) {
  if (Array.isArray(response)) return response[0] || null;
  return response?.value?.[0] || response?.data?.[0] || response?.data || response?.value || response;
}

function numericId(value) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function isApplicationOwnedByRm(record, rmId) {
  const currentRmId = numericId(rmId);
  if (!record || !currentRmId) return false;

  const ownership = resolveApplicationOwnership(record);
  return (
    (ownership.isAgentCreated || ownership.isDirectRm) &&
    numericId(ownership.rmId) === currentRmId
  );
}

export function isReturnedToRm(recordOrStatus) {
  const status = extractWorkflowStatus(recordOrStatus);
  return (
    status.workflowStatusCode === RM_WORKFLOW_CODES.RETURNED_TO_RM ||
    (!status.workflowStatusCode && Number(status.legacyStatus) === 6)
  );
}

export function getRmVerificationAction(recordOrStatus) {
  const status = extractWorkflowStatus(recordOrStatus);
  const code = status.workflowStatusCode;

  if (code === RM_WORKFLOW_CODES.RM_PENDING && Number(status.legacyStatus) === 1) {
    return { action: 'start', label: 'Verify Now', message: '' };
  }

  if (code === RM_WORKFLOW_CODES.RM_IN_PROGRESS && Number(status.legacyStatus) === 1) {
    return { action: 'resume', label: 'Resume Verification', message: '' };
  }

  if (code === RM_WORKFLOW_CODES.NEW || Number(status.legacyStatus) === 0) {
    return {
      action: 'blocked',
      label: 'Awaiting Agent Submission',
      message: 'This application must be submitted to RM before verification can begin.',
    };
  }

  return {
    action: 'blocked',
    label: 'Verification Unavailable',
    message: 'This application is not currently eligible for RM verification.',
  };
}

export function getRmWizardEligibility(record, rmId) {
  const status = extractWorkflowStatus(record);

  if (!isApplicationOwnedByRm(record, rmId)) {
    return {
      allowed: false,
      status,
      reason: 'This application is not assigned to the authenticated RM.',
    };
  }

  if (
    (status.workflowStatusCode === RM_WORKFLOW_CODES.RM_IN_PROGRESS && Number(status.legacyStatus) === 1) ||
    isReturnedToRm(status)
  ) {
    return { allowed: true, status, reason: '' };
  }

  if (status.workflowStatusCode === RM_WORKFLOW_CODES.NEW || Number(status.legacyStatus) === 0) {
    return {
      allowed: false,
      status,
      reason: 'This application must be submitted to RM before the verification wizard can be opened.',
    };
  }

  if (status.workflowStatusCode === RM_WORKFLOW_CODES.RM_PENDING) {
    return {
      allowed: false,
      status,
      reason: 'RM verification must be started from the Pending Applications queue before editing this application.',
    };
  }

  return {
    allowed: false,
    status,
    reason: 'This application is not currently eligible for RM editing.',
  };
}

export function getDeclarationSubmissionState(recordOrStatus) {
  const status = extractWorkflowStatus(recordOrStatus);
  const code = status.workflowStatusCode;
  const legacyStatus = Number(status.legacyStatus);

  if (legacyStatus === 2 && (!code || code === RM_WORKFLOW_CODES.BO_PENDING)) {
    return { eligible: false, alreadySubmitted: true, status, reason: '' };
  }

  const eligible =
    legacyStatus === 1 &&
    (!code || code === RM_WORKFLOW_CODES.RM_PENDING || code === RM_WORKFLOW_CODES.RM_IN_PROGRESS);

  if (eligible) {
    return { eligible: true, alreadySubmitted: false, status, reason: '' };
  }

  return {
    eligible: false,
    alreadySubmitted: false,
    status,
    reason:
      legacyStatus === 0 || code === RM_WORKFLOW_CODES.NEW
        ? 'This application is still with the agent and cannot be logged to HO yet.'
        : 'This application is not currently eligible for RM final submission.',
  };
}

export async function fetchCachedWorkflowRecord({ applicationId, fetcher, apiBase }) {
  const key = String(applicationId || '');
  if (!key || typeof fetcher !== 'function') {
    throw new Error('A valid application ID and workflow fetcher are required.');
  }

  const cached = workflowCache.get(key);
  if (cached && Date.now() - cached.createdAt < WORKFLOW_CACHE_TTL_MS) {
    return cached.record;
  }

  const response = await fetcher(`${apiBase}/AgentAddCustomer/${encodeURIComponent(key)}`);
  if (!response?.ok) {
    throw new Error(`Unable to verify application workflow (${response?.status || 'unknown'}).`);
  }

  const payload = await response.json();
  const record = unwrapCustomerResponse(payload);
  if (!record || typeof record !== 'object') {
    throw new Error('The application workflow response was empty.');
  }

  workflowCache.set(key, { record, createdAt: Date.now() });
  return record;
}

export function cacheWorkflowRecord(applicationId, record) {
  if (!applicationId || !record) return;
  workflowCache.set(String(applicationId), { record, createdAt: Date.now() });
}

export function clearWorkflowRecord(applicationId) {
  if (applicationId) workflowCache.delete(String(applicationId));
}

export function clearWorkflowRecordCache() {
  workflowCache.clear();
}
