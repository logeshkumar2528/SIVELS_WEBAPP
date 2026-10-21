import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApplicationEditState } from './ApplicationDraftContext';

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('useApplicationEditState', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(async () => jsonResponse({ canEdit: true, enforced: true, reason: '', status: 2 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const requestedUrl = () => String(fetchMock.mock.calls[0][0]?.url ?? fetchMock.mock.calls[0][0]);

  it('asks for the general edit state by default', async () => {
    const { result } = renderHook(() => useApplicationEditState(42));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requestedUrl()).toMatch(/\/ApplicationWorkflow\/42\/edit-state$/);
  });

  it('asks for the documents area when given one', async () => {
    const { result } = renderHook(() => useApplicationEditState(42, 'documents'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requestedUrl()).toMatch(/\/ApplicationWorkflow\/42\/edit-state\?area=documents$/);
    expect(result.current).toMatchObject({ canEdit: true, enforced: true, status: 2 });
  });
});
