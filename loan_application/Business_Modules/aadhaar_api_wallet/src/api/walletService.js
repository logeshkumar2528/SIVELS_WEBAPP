import { getAccessToken } from '../../../../Core/src/auth/tokenStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://fusiontecsoftware.com/sivels/api').replace(/\/+$/, '');
const ACCESS_ENDPOINT = (mobileNumber) => `${API_BASE_URL}/wallet/access/${encodeURIComponent(mobileNumber)}`;
const SUMMARY_ENDPOINT = `${API_BASE_URL}/wallet/summary`;
const BASELINE_ENDPOINT = `${API_BASE_URL}/wallet/baseline`;

const readJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) throw new Error('Endpoint returned HTML, check the backend URL or dev proxy');
  const data = await response.json();
  if (!response.ok) { const error = new Error(data?.error || data?.message || 'Wallet request failed'); error.status = response.status; throw error; }
  return data;
};

const request = async (url, options = {}, fallbackMessage) => {
  try {
    const token = getAccessToken();
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    return await readJson(await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    }));
  }
  catch (error) { if (error.status) throw error; throw new Error(error?.message || fallbackMessage); }
};

export function getLoggedInUser() {
  try { const user = JSON.parse(localStorage.getItem('sivels_currentUser') || 'null'); return { mobileNumber: String(user?.mobileNumber || user?.MobileNumber || user?.mobile || user?.phoneNumber || '').replace(/\D/g, '').slice(-10), fullName: user?.fullName || user?.name || '' }; }
  catch { return { mobileNumber: '', fullName: '' }; }
}

export const walletService = {
  getAccess: (mobileNumber) => request(ACCESS_ENDPOINT(mobileNumber), {}, 'Unable to verify wallet access'),
  getSummary: () => request(SUMMARY_ENDPOINT, {}, 'Unable to load wallet summary'),
  setBaseline: (balance) => request(BASELINE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ balance }) }, 'Unable to update wallet baseline'),
};
