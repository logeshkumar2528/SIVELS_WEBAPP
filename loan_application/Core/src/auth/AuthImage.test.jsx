import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthImage from './AuthImage';
import { needsAuthedFetch } from './useAuthedObjectUrl';
import { API_BASE_URL } from '../api/apiConfig';
import { navigation, resetAuthEventsForTests } from './authEvents';
import { resetRefreshStateForTests } from './refreshSession';
import { saveTokens } from './tokenStore';

const future = (ms) => new Date(Date.now() + ms).toISOString();

describe('needsAuthedFetch', () => {
  it('only matches absolute URLs under the API base', () => {
    expect(needsAuthedFetch(`${API_BASE_URL}/RMMaster/1/profile-image`)).toBe(true);
    expect(needsAuthedFetch('https://fusiontecsoftware.com/sivels/api/AgentMaster/2/pan')).toBe(true);
    expect(needsAuthedFetch('/assets/logo.png')).toBe(false);
    expect(needsAuthedFetch('blob:http://localhost/abc')).toBe(false);
    expect(needsAuthedFetch('data:image/png;base64,AAAA')).toBe(false);
    expect(needsAuthedFetch('https://cdn.example.com/a.png')).toBe(false);
    expect(needsAuthedFetch(null)).toBe(false);
  });
});

describe('AuthImage', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    resetAuthEventsForTests();
    resetRefreshStateForTests();
    saveTokens({ token: 'access-1', expiresAt: future(30 * 60_000), refreshToken: 'refresh-1' });
    vi.spyOn(navigation, 'replace').mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:authed-image');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads API images with the Bearer token and renders an object URL', async () => {
    const src = `${API_BASE_URL}/RMMaster/7/profile-image`;
    fetchMock.mockResolvedValueOnce(new Response('img', { status: 200, headers: { 'Content-Type': 'image/png' } }));

    render(<AuthImage src={src} alt="avatar" />);

    await waitFor(() => expect(screen.getByAltText('avatar').getAttribute('src')).toBe('blob:authed-image'));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(src);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer access-1');
  });

  it('falls back to the original URL when the fetch fails so onError can fire', async () => {
    const src = `${API_BASE_URL}/AgentMaster/9/profile-image`;
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));

    render(<AuthImage src={src} alt="avatar" />);

    await waitFor(() => expect(screen.getByAltText('avatar').getAttribute('src')).toBe(src));
  });

  it('passes non-API sources straight through without fetching', () => {
    render(<AuthImage src="/assets/logo.png" alt="logo" />);

    expect(screen.getByAltText('logo').getAttribute('src')).toBe('/assets/logo.png');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
