import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreditReturnAttentionStrip, CreditReturnSectionPanel } from './CreditReturnPanel';

const legalItem = {
  id: 1,
  sectionCode: 'LEGAL_OPINION',
  sectionName: 'Legal Report',
  fieldLabel: 'Legal Report',
  issue: 'Owner name on the legal report does not match the sale deed.',
  itemStatus: 'Open',
  isResolved: false,
  raisedByUserId: 21,
  raisedByRole: 'CreditManager',
  raisedAt: '2026-10-09T10:00:00',
  events: [
    {
      id: 5,
      eventType: 'Returned',
      remarks: 'Owner name mismatch',
      performedByUserId: 21,
      performedByRole: 'CreditManager',
      createdAt: '2026-10-09T10:00:00',
    },
  ],
};

const assetItem = {
  id: 2,
  sectionCode: 'ASSET_BASE',
  sectionName: 'Asset Base',
  fieldLabel: 'Asset Base',
  issue: 'Asset value is not supported by the valuation report.',
  itemStatus: 'Resubmitted',
  isResolved: true,
  raisedByUserId: 21,
  raisedByRole: 'CreditManager',
  raisedAt: '2026-10-08T10:00:00',
  resolutionNote: 'Asset value updated to match the valuation report.',
  resolvedByUserId: 7,
  resolvedByRole: 'BackOffice',
  resolvedAt: '2026-10-08T12:00:00',
  resubmittedAt: '2026-10-08T13:00:00',
  events: [],
};

describe('CreditReturnAttentionStrip', () => {
  it('renders nothing when no section needs attention', () => {
    const { container } = render(<CreditReturnAttentionStrip sections={[]} viewerRole="BackOffice" onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a red marker per section and opens the right section on click', () => {
    const onOpen = vi.fn();
    const { container } = render(
      <CreditReturnAttentionStrip
        sections={[
          { stepId: 11, visibleNum: '06', sectionName: 'Legal Report', count: 1 },
          { stepId: 20, visibleNum: '11', sectionName: 'Asset Base', count: 2 },
        ]}
        viewerRole="BackOffice"
        onOpen={onOpen}
      />
    );
    expect(container.querySelectorAll('.crp-indicator')).toHaveLength(2);
    expect(screen.getByText(/3 items returned by the Credit Manager need correction/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open Asset Base/ }));
    expect(onOpen).toHaveBeenCalledWith(20);
  });
});

describe('CreditReturnSectionPanel — Back Office', () => {
  it('shows the Credit Manager remarks read-only with who/when', () => {
    render(<CreditReturnSectionPanel sectionTitle="Legal Report" items={[legalItem]} viewerRole="BackOffice" canAct />);
    expect(screen.getByText(legalItem.issue)).toBeInTheDocument();
    expect(screen.getByText(/Credit Manager #21/)).toBeInTheDocument();
    expect(screen.getByText('Returned to Back Office')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(legalItem.issue)).not.toBeInTheDocument();
  });

  it('requires resolution remarks before resolving', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CreditReturnSectionPanel sectionTitle="Legal Report" items={[legalItem]} viewerRole="BackOffice" canAct onSubmit={onSubmit} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Resolution remarks are required.');
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Resolution remarks/), { target: { value: '  Legal report re-uploaded.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(legalItem, 'Legal report re-uploaded.'));
  });

  it('shows the API error when resolving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ response: { data: { message: 'Only active Back Office users can resolve items.' } } });
    render(
      <CreditReturnSectionPanel sectionTitle="Legal Report" items={[legalItem]} viewerRole="BackOffice" canAct onSubmit={onSubmit} />
    );
    fireEvent.change(screen.getByLabelText(/Resolution remarks/), { target: { value: 'Fixed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only active Back Office users can resolve items.');
  });

  it('hides the form and explains why when the user cannot act', () => {
    render(
      <CreditReturnSectionPanel
        sectionTitle="Legal Report"
        items={[legalItem]}
        viewerRole="BackOffice"
        canAct={false}
        lockedReason="Not with the Back Office."
      />
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Not with the Back Office.')).toBeInTheDocument();
  });

  it('shows the event history on demand', () => {
    render(<CreditReturnSectionPanel sectionTitle="Legal Report" items={[legalItem]} viewerRole="BackOffice" />);
    expect(screen.queryByText('Owner name mismatch')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show history (1)' }));
    expect(screen.getByText('Returned by Credit Manager')).toBeInTheDocument();
    expect(screen.getByText('Owner name mismatch')).toBeInTheDocument();
  });

  it('keeps previous rejections behind a toggle', () => {
    const previous = { ...legalItem, id: 9, itemStatus: 'Reopened', issue: 'First round issue', events: [] };
    render(<CreditReturnSectionPanel sectionTitle="Legal Report" items={[legalItem, previous]} viewerRole="BackOffice" />);
    expect(screen.queryByText('First round issue')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous rejections (1)' }));
    expect(screen.getByText('First round issue')).toBeInTheDocument();
    expect(screen.getByText('Rejected Again')).toBeInTheDocument();
  });
});

describe('CreditReturnSectionPanel — Credit Manager (Asset Base resubmission)', () => {
  it('shows the Resubmitted status, both remarks, and accepts with mandatory remarks', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <CreditReturnSectionPanel sectionTitle="Asset Base" items={[assetItem]} viewerRole="CreditManager" canAct onSubmit={onSubmit} />
    );

    expect(screen.getByText('Resubmitted to Credit Manager')).toBeInTheDocument();
    expect(screen.getByText(assetItem.issue)).toBeInTheDocument();
    expect(screen.getByText(assetItem.resolutionNote)).toBeInTheDocument();
    expect(screen.getByText(/Back Office #7/)).toBeInTheDocument();
    expect(container.querySelector('.crp-panel.needs-action')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Accept Resolution' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Review remarks are required.');

    fireEvent.change(screen.getByLabelText(/Review remarks/), { target: { value: 'Valuation verified.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Accept Resolution' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(assetItem, 'Valuation verified.'));
  });

  it('shows no red marker or form for the Back Office once resubmitted', () => {
    const { container } = render(
      <CreditReturnSectionPanel sectionTitle="Asset Base" items={[assetItem]} viewerRole="BackOffice" canAct />
    );
    expect(container.querySelector('.crp-indicator')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('No action required from you')).toBeInTheDocument();
  });
});
