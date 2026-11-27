import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  contextValue: {
    applicationId: '98',
    application: {
      agentCustomerId: '98',
      applicationProductDetailsId: '123',
      fullName: 'Test Customer',
      loanProductName: 'Term Loan',
    },
    profile: { operationsUserId: 7 },
    profileLoading: false,
    profileError: null,
  },
  getFees: vi.fn(),
  getApplicationProductDetailsByCustomer: vi.fn(),
  getByCustomer: vi.fn(),
  preview: vi.fn(),
  save: vi.fn(),
}));

const { getFees, getApplicationProductDetailsByCustomer, getByCustomer, preview, save } = mocks;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useLocation: () => ({ search: '?applicationId=98' }),
}));

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../../../../../../Master_Module/src/api/masters/feeMasterApi', () => ({ getFees: mocks.getFees }));
vi.mock('../../../../../back_office/src/back-office/api/backOfficeService', () => ({
  default: { getApplicationProductDetailsByCustomer: mocks.getApplicationProductDetailsByCustomer },
}));
vi.mock('../../../context/OperationsApplicationContext', () => ({
  useOperationsApplication: () => mocks.contextValue,
}));
vi.mock('../../../layouts/OperationsLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock('../../../services/operationsFeesService', () => ({
  default: { getByCustomer: mocks.getByCustomer, preview: mocks.preview, save: mocks.save },
  getFeesApiErrorMessage: (error, fallback) => error?.message || fallback,
}));

import Fees from './Fees';

describe('Fees screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFees.mockResolvedValue([{ feeId: 1, feeName: 'Processing Fee', isActive: true }]);
    getApplicationProductDetailsByCustomer.mockResolvedValue({ agentCustomerId: 98, applicationProductDetailsId: 123 });
    getByCustomer.mockResolvedValue(null);
    preview.mockResolvedValue({
      header: { totalCalculatedFee: 0, totalNetGst: 0, totalTotPaid: 0, totalTotRemaining: 0 },
      lines: [],
      grossDisbursementAmount: 100000,
      totalApplicableFeeDeduction: 0,
      finalNetDisbursementAmount: 100000,
    });
    save.mockResolvedValue({ header: {}, lines: [] });
  });

  it('loads Fee Master rows and exposes the confirmed manual controls', async () => {
    render(<Fees />);

    await waitFor(() => expect(screen.getByLabelText('Fee Name for line 1')).toBeInTheDocument());
    expect(screen.getByLabelText('Fee Name for line 1')).toBeInTheDocument();
    expect(screen.getByLabelText('GST Treatment for Processing Fee')).toBeInTheDocument();
    expect(screen.getByLabelText('GST % for Processing Fee')).toBeInTheDocument();
    expect(screen.getByLabelText('Fee Schedule Method for Processing Fee')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save & Continue/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Remove fee line 1/i })).toBeInTheDocument();
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Validated application and authenticated Operations context.')).not.toBeInTheDocument();
    expect(screen.queryByText('Agent Customer ID')).not.toBeInTheDocument();
  });

  it('treats a missing saved record as a new application state', async () => {
    render(<Fees />);

    await waitFor(() => expect(getByCustomer).toHaveBeenCalledWith(98, 123));
    expect(screen.getByText('Gross Disbursement Amount')).toBeInTheDocument();
    expect(screen.getByText('Final Net Disbursement Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Fee Name for line 1')).toBeInTheDocument();
  });

  it('removes rows without calling the DELETE endpoint and blocks empty-table save', async () => {
    render(<Fees />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Remove fee line 1/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Remove fee line 1/i }));

    await waitFor(() => expect(screen.getByText('No saved fee lines. Use Add Fee Line to begin.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Save & Continue/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add Fee Line/i })).not.toBeDisabled();
  });

  it('filters selected Fee Master IDs while retaining each row selection', async () => {
    getFees.mockResolvedValue([
      { feeId: '1', feeName: 'Application Fee', isActive: true },
      { feeId: 2, feeName: 'Processing Fee', isActive: true },
    ]);
    getByCustomer.mockResolvedValue({
      header: { operationsFeeHeaderId: 55 },
      lines: [{ feeId: '1', feeName: 'Application Fee' }],
    });

    render(<Fees />);

    await waitFor(() => expect(screen.getByLabelText('Fee Name for line 1')).toHaveValue('1'));
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add Fee Line/i }));

    const secondDropdown = await screen.findByLabelText('Fee Name for line 2');
    expect(Array.from(secondDropdown.options).map((option) => option.textContent)).toEqual(['Select Fee', 'Processing Fee']);
    expect(screen.getByLabelText('Fee Name for line 1')).toHaveValue('1');
  });

  it('navigates Back to Loan Basic Details with the selected application context', async () => {
    render(<Fees />);

    await waitFor(() => expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    expect(mocks.navigate).toHaveBeenCalledWith('/operations/maker/loan-basic-details?applicationId=98');
  });

  it('saves and verifies persistence before navigating to Covenants', async () => {
    const saved = {
      header: { operationsFeeHeaderId: 44, notes: 'Saved notes' },
      lines: [{ feeId: 1, feeName: 'Processing Fee', gstTreatment: 'Exclusive', gstPercent: 0.18 }],
    };
    getByCustomer.mockResolvedValue(saved);
    save.mockResolvedValue(saved);

    render(<Fees />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Save & Continue/i })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    fireEvent.change(screen.getByLabelText('GST % for Processing Fee'), { target: { value: '19' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Save & Continue/i })).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Save & Continue/i }));

    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(getByCustomer).toHaveBeenCalledWith(98, 123);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/operations/maker/covenants?applicationId=98'));
  });
});
