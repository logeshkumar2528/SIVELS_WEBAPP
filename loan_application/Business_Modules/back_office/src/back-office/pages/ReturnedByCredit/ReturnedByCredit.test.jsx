import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const legalItem = {
  id: 1,
  decisionId: 10,
  sectionCode: 'LEGAL_OPINION',
  sectionName: 'Legal Report',
  fieldLabel: 'Legal Report',
  issue: 'Owner name mismatch.',
  itemStatus: 'Open',
  isResolved: false,
};

const application = {
  agentCustomerId: 99,
  appId: 'APP-2026-099',
  customerName: 'Ravi Kumar',
  isCreditReady: true,
  returnItems: [legalItem],
  openReturnItems: [legalItem],
  returnRemarks: 'Legal Report › Legal Report: Owner name mismatch.',
  returnedAt: '2026-10-09T10:00:00',
  returnedByName: 'Credit Manager #21',
};

const service = vi.hoisted(() => ({
  resolveCreditReturnItem: vi.fn(),
  sendApplicationToCreditManager: vi.fn(),
}));

vi.mock('../../api/backOfficeService', () => ({ default: service }));
vi.mock('../../auth/authStorage', () => ({ getBackOfficeAuth: () => ({ backOfficeId: 7 }) }));
vi.mock('../../hooks/useCustomerQueue', () => ({
  useCustomerQueue: () => ({ customers: [application], loading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../../hooks/useCreditReturns', () => ({
  useCreditReturns: () => ({ returnedApplications: [application], loading: false, error: null, refetch: vi.fn() }),
}));

const { default: ReturnedByCredit } = await import('./ReturnedByCredit');

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/backoffice/returned-by-credit']}>
      <Routes>
        <Route path="/backoffice/returned-by-credit" element={<ReturnedByCredit />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ReturnedByCredit', () => {
  beforeEach(() => {
    service.resolveCreditReturnItem.mockReset();
    service.sendApplicationToCreditManager.mockReset();
  });

  it('marks the returned Legal Report in red and opens that section when clicked', () => {
    renderPage();
    const chip = screen.getByRole('button', { name: 'Open Legal Report (action required)' });
    expect(chip.querySelector('.crp-indicator')).not.toBeNull();

    fireEvent.click(chip);
    expect(screen.getByTestId('location')).toHaveTextContent('/customers/99/verify?step=6');
  });

  it('resolves the returned section and resubmits to the Credit Manager', async () => {
    service.resolveCreditReturnItem.mockResolvedValue({
      applicationCreditReturnItemId: 1,
      applicationCreditDecisionId: 10,
      sectionCode: 'LEGAL_OPINION',
      sectionName: 'Legal Report',
      fieldLabel: 'Legal Report',
      issue: 'Owner name mismatch.',
      itemStatus: 'Resolved',
      resolutionNote: 'Re-uploaded the corrected legal report.',
      resolvedByUserId: 7,
      resolvedByRole: 'BackOffice',
    });
    service.sendApplicationToCreditManager.mockResolvedValue({});
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Mark corrections and send application/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /1 Field Still Open/ })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Resolve' }));
    expect(await within(dialog).findByText('Describe how this field was corrected.')).toBeInTheDocument();
    expect(service.resolveCreditReturnItem).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByPlaceholderText(/What did you correct/), {
      target: { value: 'Re-uploaded the corrected legal report.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Resolve' }));

    await waitFor(() =>
      expect(service.resolveCreditReturnItem).toHaveBeenCalledWith(1, {
        resolvedByUserId: 7,
        resolvedByRole: 'BackOffice',
        resolutionNote: 'Re-uploaded the corrected legal report.',
      })
    );
    expect(await within(dialog).findByText('Resolved · Not Resubmitted')).toBeInTheDocument();

    const resubmit = within(dialog).getByRole('button', { name: 'Resubmit to Credit Manager' });
    expect(resubmit).toBeEnabled();
    fireEvent.click(resubmit);

    await waitFor(() =>
      expect(service.sendApplicationToCreditManager).toHaveBeenCalledWith(99, {
        performedByUserId: 7,
        performedByRole: 'BackOffice',
        remarks: 'Legal Report › Legal Report: Re-uploaded the corrected legal report.',
      })
    );
    expect(await screen.findByText(/has been resubmitted to the Credit Manager/)).toBeInTheDocument();
  });
});
