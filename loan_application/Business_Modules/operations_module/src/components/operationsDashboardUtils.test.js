import { describe, expect, it } from 'vitest';
import {
  combineDashboardApplications,
  formatDashboardAmount,
  formatDashboardDate,
  getDashboardMetrics,
  getLoanAccountNumber,
  getOfficialApplicationNumber,
  getWorkflowStatusName,
  matchesDashboardApplication,
  sortRecentApplications,
} from './operationsDashboardUtils';

describe('operations dashboard utilities', () => {
  it('calculates active counts and percentages from complete queue arrays', () => {
    expect(getDashboardMetrics([{}, {}], [{}])).toEqual({
      newCount: 2,
      pendingCount: 1,
      activeCount: 3,
      newPercentage: (2 / 3) * 100,
      pendingPercentage: (1 / 3) * 100,
    });
  });

  it('returns zero metrics for empty queues without division by zero', () => {
    expect(getDashboardMetrics()).toEqual({
      newCount: 0,
      pendingCount: 0,
      activeCount: 0,
      newPercentage: 0,
      pendingPercentage: 0,
    });
  });

  it('maps nested workflow status and preserves appId as the official number', () => {
    const application = {
      appId: 'APP-1001',
      loanAccountNumber: 'LN-1001',
      customerCode: 'CU0001',
      workflow: { workflowStatusName: 'Maker Verification In Progress' },
    };

    expect(getOfficialApplicationNumber(application)).toBe('APP-1001');
    expect(getLoanAccountNumber(application)).toBe('LN-1001');
    expect(getWorkflowStatusName(application)).toBe('Maker Verification In Progress');
  });

  it('formats valid zero amounts and invalid or missing amounts safely', () => {
    expect(formatDashboardAmount(0)).toContain('0');
    expect(formatDashboardAmount('')).toBe('—');
    expect(formatDashboardAmount('not-a-number')).toBe('—');
    expect(formatDashboardDate('not-a-date')).toBe('—');
  });

  it('combines queues, searches all supported fields, and filters by queue', () => {
    const applications = combineDashboardApplications(
      [{ agentCustomerId: 1, fullName: 'Asha Rao', customerCode: 'CU1', appId: 'APP1', loanProductName: 'Term Loan' }],
      [{ agentCustomerId: 2, fullName: 'Bharat Das', customerCode: 'CU2', appId: 'APP2', loanAccountNumber: 'LN2', loanProductName: 'Working Capital' }],
    );

    expect(applications).toHaveLength(2);
    expect(matchesDashboardApplication(applications[1], 'LN2', 'Pending')).toBe(true);
    expect(matchesDashboardApplication(applications[0], 'APP2', 'all')).toBe(false);
  });

  it('sorts recent applications by statusChangedAt descending', () => {
    const sorted = sortRecentApplications([
      { agentCustomerId: 1, statusChangedAt: '2026-01-01T00:00:00Z' },
      { agentCustomerId: 2, statusChangedAt: '2026-02-01T00:00:00Z' },
      { agentCustomerId: 3, statusChangedAt: null },
    ]);

    expect(sorted.map((application) => application.agentCustomerId)).toEqual([2, 1, 3]);
  });
});
