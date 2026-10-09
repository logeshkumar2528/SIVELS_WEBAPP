import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SectionReviewBar from './SectionReviewBar';

const section = { id: 11, visibleNum: '06', title: 'Legal Report' };

function renderBar(props = {}) {
  const handlers = {
    onToggleEdit: vi.fn(),
    onApprove: vi.fn(),
    onUnapprove: vi.fn(),
    onReject: vi.fn(),
    onClearFlags: vi.fn(),
  };
  render(<SectionReviewBar section={section} status={null} flagCount={0} isEditing={false} canEdit {...handlers} {...props} />);
  return handlers;
}

describe('SectionReviewBar', () => {
  it('opens the rejection remarks form when Reject is clicked', () => {
    const { onReject } = renderBar();
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('blocks approval while a Back Office resolution awaits review', () => {
    const { onApprove } = renderBar({ awaitingReviewCount: 1 });
    const approve = screen.getByRole('button', { name: 'Approve' });
    expect(approve).toBeDisabled();
    expect(screen.getByText('1 Back Office resolution to review below')).toBeInTheDocument();
    fireEvent.click(approve);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('hides actions when the application is not pending with the Credit Manager', () => {
    renderBar({ canEdit: false });
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });
});
