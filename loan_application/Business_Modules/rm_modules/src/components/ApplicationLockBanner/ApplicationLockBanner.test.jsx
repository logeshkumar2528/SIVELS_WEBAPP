import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationLockBanner from './ApplicationLockBanner';
import { useApplicationEditState } from '../../state/ApplicationDraftContext';
import { clearLockForcedView, markLockForcedView, wasLockForcedView } from '../../utils/lockForcedView';

vi.mock('../../state/ApplicationDraftContext', () => ({
  useApplicationEditState: vi.fn(),
}));

const LOCKED = { canEdit: false, reason: 'Back Office has started verification.', enforced: true, loading: false };
const EDITABLE = { canEdit: true, reason: '', enforced: true, loading: false };
const LOADING = { canEdit: true, reason: '', enforced: false, loading: true };

function CurrentSearch() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}

function renderBanner({ url, area }) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ApplicationLockBanner appId="42" area={area} />
      <CurrentSearch />
    </MemoryRouter>
  );
}

const search = () => screen.getByTestId('search').textContent;

describe('ApplicationLockBanner', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('switches a locked page to view mode and remembers that the lock did it', async () => {
    useApplicationEditState.mockReturnValue(LOCKED);
    renderBanner({ url: '/app/42/details' });

    expect(screen.getByText('This application is read-only.')).toBeTruthy();
    await waitFor(() => expect(search()).toBe('?mode=view'));
    expect(wasLockForcedView('42')).toBe(true);
  });

  it('passes the documents area to the edit-state lookup', () => {
    useApplicationEditState.mockReturnValue(EDITABLE);
    renderBanner({ url: '/app/42/kyc', area: 'documents' });

    expect(useApplicationEditState).toHaveBeenCalledWith('42', 'documents');
  });

  it('lifts lock-forced view mode on a documents page when documents are editable', async () => {
    markLockForcedView('42');
    useApplicationEditState.mockReturnValue(EDITABLE);
    renderBanner({ url: '/app/42/kyc?mode=view', area: 'documents' });

    await waitFor(() => expect(search()).toBe(''));
    expect(screen.queryByText('This application is read-only.')).toBeNull();
  });

  it('keeps view mode the RM chose', async () => {
    useApplicationEditState.mockReturnValue(EDITABLE);
    renderBanner({ url: '/app/42/kyc?mode=view', area: 'documents' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(search()).toBe('?mode=view');
  });

  it('keeps view mode while the documents lookup is still loading', async () => {
    markLockForcedView('42');
    useApplicationEditState.mockReturnValue(LOADING);
    renderBanner({ url: '/app/42/kyc?mode=view', area: 'documents' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(search()).toBe('?mode=view');
  });

  it('keeps documents pages read-only when documents are locked too', async () => {
    markLockForcedView('42');
    useApplicationEditState.mockReturnValue(LOCKED);
    renderBanner({ url: '/app/42/kyc?mode=view', area: 'documents' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(search()).toBe('?mode=view');
    expect(screen.getByText('This application is read-only.')).toBeTruthy();
  });

  it('does not lift view mode on pages outside the documents area', async () => {
    markLockForcedView('42');
    useApplicationEditState.mockReturnValue(EDITABLE);
    renderBanner({ url: '/app/42/address?mode=view' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(search()).toBe('?mode=view');
  });
});

describe('lockForcedView', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('tracks each application separately and can be cleared', () => {
    markLockForcedView(42);
    expect(wasLockForcedView('42')).toBe(true);
    expect(wasLockForcedView('43')).toBe(false);

    clearLockForcedView('42');
    expect(wasLockForcedView(42)).toBe(false);
  });

  it('ignores missing ids', () => {
    markLockForcedView(undefined);
    expect(wasLockForcedView(undefined)).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });
});
