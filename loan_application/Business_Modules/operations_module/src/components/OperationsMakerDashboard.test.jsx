import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshQueue: vi.fn(),
  contextValue: {},
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../context/OperationsApplicationContext', () => ({
  useOperationsApplication: () => mocks.contextValue,
}));

import OperationsMakerDashboard from './OperationsMakerDashboard';

describe('OperationsMakerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contextValue = {
      newApplications: [{
        agentCustomerId: '1',
        fullName: 'Asha Rao',
        customerCode: 'CU001',
        appId: 'APP001',
        loanAccountNumber: 'LN001',
        loanProductName: 'Term Loan',
        sanctionedLoanAmount: 0,
        statusChangedAt: '2026-02-02T00:00:00Z',
        workflow: {
          workflowStatusName: 'Credit Approved – Maker Pending',
          operationsReceivedAt: '2026-02-01T00:00:00Z',
        },
      }],
      pendingApplications: [{
        agentCustomerId: '2',
        fullName: 'Bharat Das',
        customerCode: 'CU002',
        appId: 'APP002',
        loanAccountNumber: 'LN002',
        loanProductName: 'Working Capital',
        sanctionedLoanAmount: 125000,
        statusChangedAt: '2026-02-01T00:00:00Z',
        workflow: {
          workflowStatusName: 'Maker Verification In Progress',
          operationsReceivedAt: '2026-01-31T00:00:00Z',
        },
      }],
      queueStatus: 'ready',
      queueError: null,
      refreshQueue: mocks.refreshQueue,
    };
  });

  it('renders queue-driven metrics and nested workflow fields', () => {
    render(<OperationsMakerDashboard profile={{ employeeCode: 'MK001' }} displayName="Asha Rao" />);

    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(screen.queryByText('Operations / Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Refresh$/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('active-applications-metric')).toHaveTextContent('2');
    expect(screen.getByTestId('new-applications-metric')).toHaveTextContent('1');
    expect(screen.getByTestId('pending-applications-metric')).toHaveTextContent('1');
    expect(screen.getByText('Credit Approved – Maker Pending')).toBeInTheDocument();
    expect(screen.getByText('Maker Verification In Progress')).toBeInTheDocument();
    expect(screen.getByText('₹0.00')).toBeInTheDocument();
    expect(screen.getByText('Loan Account Number')).toBeInTheDocument();
    expect(screen.getByText('LN001')).toBeInTheDocument();
    expect(screen.queryByText('APP001')).not.toBeInTheDocument();
    expect(screen.getAllByText('50.0%')).toHaveLength(2);
  });

  it('combines search and status filtering and preserves existing navigation contracts', () => {
    render(<OperationsMakerDashboard profile={{ employeeCode: 'MK001' }} displayName="Asha Rao" />);

    fireEvent.change(screen.getByLabelText('Filter applications by status'), { target: { value: 'Pending' } });
    expect(screen.getByText('Bharat Das')).toBeInTheDocument();
    expect(screen.queryByText('LN001')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search dashboard applications'), { target: { value: 'LN002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/operations/maker/loan-basic-details?applicationId=2');
  });

  it('keeps New actions on the existing New Applications queue', () => {
    render(<OperationsMakerDashboard profile={{ employeeCode: 'MK001' }} displayName="Asha Rao" />);

    fireEvent.change(screen.getByLabelText('Search dashboard applications'), { target: { value: 'LN001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open Queue' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/operations/maker/new-applications');
  });

  it('does not display zero metrics while the queue is loading', () => {
    mocks.contextValue = {
      newApplications: [],
      pendingApplications: [],
      queueStatus: 'loading',
      queueError: null,
      refreshQueue: mocks.refreshQueue,
    };

    render(<OperationsMakerDashboard profile={{ employeeCode: 'MK001' }} displayName="Asha Rao" />);

    expect(screen.getByText('Loading your application queues…')).toBeInTheDocument();
    expect(screen.queryByTestId('active-applications-metric')).not.toBeInTheDocument();
  });

  it('shows a queue error and retries through the shared refresh function', () => {
    mocks.contextValue = {
      newApplications: [],
      pendingApplications: [],
      queueStatus: 'error',
      queueError: { message: 'Queue request failed' },
      refreshQueue: mocks.refreshQueue,
    };

    render(<OperationsMakerDashboard profile={{ employeeCode: 'MK001' }} displayName="Asha Rao" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Queue request failed');
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(mocks.refreshQueue).toHaveBeenCalledTimes(1);
  });

  it('previews four records, expands with View All pagination, and resets on search', () => {
    mocks.contextValue = {
      newApplications: Array.from({ length: 11 }, (_, index) => ({
        agentCustomerId: String(index + 1),
        fullName: `Customer ${index + 1}`,
        appId: `APP${index + 1}`,
        loanAccountNumber: `LN${index + 1}`,
        statusChangedAt: `2026-02-${String(11 - (index % 10)).padStart(2, '0')}T00:00:00Z`,
      })),
      pendingApplications: [],
      queueStatus: 'ready',
      queueError: null,
      refreshQueue: mocks.refreshQueue,
    };

    render(<OperationsMakerDashboard profile={{ employeeCode: 'MK001' }} displayName="Asha Rao" />);

    expect(screen.getAllByRole('row')).toHaveLength(5);
    expect(screen.getByText('Customer 1')).toBeInTheDocument();
    expect(screen.queryByText('Customer 5')).not.toBeInTheDocument();
    expect(screen.queryByText('Page 1 of 2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Customer 5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search dashboard applications'), { target: { value: 'LN1' } });
    expect(screen.queryByText('Page 2 of 2')).not.toBeInTheDocument();
    expect(screen.getByText('Customer 1')).toBeInTheDocument();
    expect(screen.getByText('Customer 10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View all' })).not.toBeInTheDocument();
  });
});
