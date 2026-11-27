import { describe, expect, it } from 'vitest'
import { extractWorkflowStatus } from '../../../../../Core/src/utils/applicationWorkflowStatus'
import {
  WORKFLOW_STATUS_CODES,
  getWorkflowStatusPresentation,
  isNewApplication,
  matchesWorkflowStatusFilter,
} from './workflowStatusDisplay'

describe('Agent workflow status display helpers', () => {
  it('uses the backend workflow name and code for badge presentation', () => {
    const status = extractWorkflowStatus({
      workflow: {
        workflowStatusCode: WORKFLOW_STATUS_CODES.RM_VERIFICATION_PENDING,
        workflowStatusName: 'RM Verification Pending',
      },
    })

    expect(getWorkflowStatusPresentation(status)).toMatchObject({
      workflowStatusCode: WORKFLOW_STATUS_CODES.RM_VERIFICATION_PENDING,
      displayName: 'RM Verification Pending',
      badgeType: 'pending-rm',
    })
  })

  it('filters by workflow code instead of status text', () => {
    const status = extractWorkflowStatus({
      workflowStatusCode: WORKFLOW_STATUS_CODES.CM_REVIEW_IN_PROGRESS,
      workflowStatusName: 'Backend supplied name',
    })

    expect(matchesWorkflowStatusFilter(status, 'CREDIT_REVIEW')).toBe(true)
    expect(matchesWorkflowStatusFilter(status, WORKFLOW_STATUS_CODES.RM_VERIFICATION_PENDING)).toBe(false)
    expect(matchesWorkflowStatusFilter(status, 'ALL')).toBe(true)
  })

  it('preserves legacy zero for new applications without inventing a detailed status', () => {
    const status = extractWorkflowStatus({ status: 0 })

    expect(isNewApplication(status)).toBe(true)
    expect(getWorkflowStatusPresentation(status).displayName).toBe('Status unavailable')
  })
})
