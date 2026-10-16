const USE_MOCK_WALLET_API = import.meta.env.DEV;
const BALANCE_ENDPOINT = '/api/aadhaar-wallet/balance';
const MOCK_BALANCE = { balance: 967.55, fetchedAt: new Date().toISOString() };

const readJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    throw new Error(`Balance request failed (${response.status})`);
  }
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Endpoint returned HTML, check the backend URL or dev proxy');
  }
  return response.json();
};

export const walletService = {
  async getBalance() {
    if (USE_MOCK_WALLET_API) return { ...MOCK_BALANCE, fetchedAt: new Date().toISOString() };
    return readJson(await fetch(BALANCE_ENDPOINT));
  }
};
