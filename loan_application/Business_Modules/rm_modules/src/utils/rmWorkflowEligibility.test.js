import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearWorkflowRecordCache,
  getDeclarationSubmissionState,
  getRmVerificationAction,
  getRmWizardEligibility,
  isApplicationOwnedByRm,
} from './rmWorkflowEligibility';

const agentDraft = {
  agentCustomerId: 101,
  agentId: 35,
  rmId: 26,
  createdByRole: 'Agent',
  status: 0,
  workflowStatusCode: 'NEW_APPLICATION',
};

const directRmDraft = {
  agentCustomerId: 202,
  rmId: 26,
  createdByRole: 'RM',
  status: 0,
  workflowStatusCode: 'NEW_APPLICATION',
};

describe('RM workflow eligibility', () => {
  beforeEach(() => clearWorkflowRecordCache());

  it('excludes Agent-created status-0 records from verification actions', () => {
    expect(getRmVerificationAction(agentDraft).action).toBe('blocked');
    expect(getRmWizardEligibility(agentDraft, 26).allowed).toBe(false);
  });

  it('does not allow a direct RM draft into verification', () => {
    expect(isApplicationOwnedByRm(directRmDraft, 26)).toBe(true);
    expect(getRmWizardEligibility(directRmDraft, 26).allowed).toBe(false);
  });

  it('starts only RM pending applications and resumes in-progress applications', () => {
    expect(getRmVerificationAction({ ...agentDraft, status: 1, workflowStatusCode: 'RM_VERIFICATION_PENDING' })).toMatchObject({ action: 'start' });
    expect(getRmVerificationAction({ ...agentDraft, status: 1, workflowStatusCode: 'RM_VERIFICATION_IN_PROGRESS' })).toMatchObject({ action: 'resume' });
  });

  it('fails closed for unknown states and preserves returned RM correction', () => {
    expect(getRmWizardEligibility({ ...agentDraft, status: 99, workflowStatusCode: 'UNKNOWN' }, 26).allowed).toBe(false);
    expect(getRmWizardEligibility({ ...agentDraft, status: 6, workflowStatusCode: 'RETURNED_TO_RM_CORRECTION_PENDING' }, 26).allowed).toBe(true);
  });

  it('requires status 1 for Declaration and preserves already-submitted handling', () => {
    expect(getDeclarationSubmissionState(agentDraft)).toMatchObject({ eligible: false, alreadySubmitted: false });
    expect(getDeclarationSubmissionState({ ...agentDraft, status: 1, workflowStatusCode: 'RM_VERIFICATION_IN_PROGRESS' })).toMatchObject({ eligible: true });
    expect(getDeclarationSubmissionState({ status: 2, workflowStatusCode: 'BO_VERIFICATION_PENDING' })).toMatchObject({ alreadySubmitted: true });
  });
});
