import { describe, expect, it } from 'vitest';
import { extractWorkflowStatus } from './applicationWorkflowStatus';

describe('extractWorkflowStatus', () => {
  it('extracts a nested workflow response', () => {
    expect(extractWorkflowStatus({
      workflow: {
        workflowStatusCode: 'RM_VERIFICATION_IN_PROGRESS',
        workflowStatusName: 'RM Verification In Progress',
        legacyStatus: 1,
        pendingWithRole: 'RM',
      },
    })).toMatchObject({
      workflowStatusCode: 'RM_VERIFICATION_IN_PROGRESS',
      workflowStatusName: 'RM Verification In Progress',
      legacyStatus: 1,
      pendingWithRole: 'RM',
      hasDetailedWorkflowStatus: true,
    });
  });

  it('extracts top-level workflow fields and preserves legacy status zero', () => {
    expect(extractWorkflowStatus({
      workflowStatusCode: 'NEW_APPLICATION',
      workflowStatusName: 'New Application',
      legacyStatus: 0,
    })).toMatchObject({
      workflowStatusCode: 'NEW_APPLICATION',
      workflowStatusName: 'New Application',
      legacyStatus: 0,
      hasDetailedWorkflowStatus: true,
    });
  });

  it('extracts workflow fields from full application details', () => {
    expect(extractWorkflowStatus({
      applicationStatus: {
        workflowStatusCode: 'BO_VERIFICATION_PENDING',
        workflowStatusName: 'Back Office Verification Pending',
        workflow: {
          departmentName: 'Back Office',
          statusUpdatedAt: '2026-11-27T10:00:00Z',
        },
      },
    })).toMatchObject({
      workflowStatusCode: 'BO_VERIFICATION_PENDING',
      workflowStatusName: 'Back Office Verification Pending',
      departmentName: 'Back Office',
      statusUpdatedAt: '2026-11-27T10:00:00Z',
      hasDetailedWorkflowStatus: true,
    });
  });

  it('extracts a workflow transition response', () => {
    expect(extractWorkflowStatus({
      agentCustomerId: 42,
      fromStatus: 'RM_VERIFICATION_PENDING',
      toStatus: 'RM_VERIFICATION_IN_PROGRESS',
      workflow: {
        workflowStatusCode: 'RM_VERIFICATION_IN_PROGRESS',
        workflowStatusName: 'RM Verification In Progress',
        lastTransitionAt: '2026-11-27T11:00:00Z',
        reason: 'Verification started',
      },
    })).toMatchObject({
      workflowStatusCode: 'RM_VERIFICATION_IN_PROGRESS',
      lastTransitionAt: '2026-11-27T11:00:00Z',
      reason: 'Verification started',
    });
  });

  it('supports casing variations for workflow fields', () => {
    expect(extractWorkflowStatus({
      Workflow: {
        WorkflowStatusCode: 'APPLICATION_REJECTED',
        WorkflowStatusName: 'Application Rejected',
        LegacyStatus: 5,
        Reason: 'Rejected by credit review',
      },
    })).toMatchObject({
      workflowStatusCode: 'APPLICATION_REJECTED',
      workflowStatusName: 'Application Rejected',
      legacyStatus: 5,
      reason: 'Rejected by credit review',
    });
  });

  it('exposes missing workflow data without inventing a status', () => {
    expect(extractWorkflowStatus({ status: 0 })).toMatchObject({
      workflowStatusCode: null,
      workflowStatusName: null,
      legacyStatus: 0,
      hasDetailedWorkflowStatus: false,
    });
  });

  it('handles null and malformed responses safely', () => {
    expect(extractWorkflowStatus(null).hasDetailedWorkflowStatus).toBe(false);
    expect(extractWorkflowStatus([]).hasDetailedWorkflowStatus).toBe(false);
    expect(extractWorkflowStatus('invalid').legacyStatus).toBeNull();
  });
});
