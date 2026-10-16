import { useCallback, useEffect, useState } from 'react';
import { walletService } from './api/walletService';

const LOW_BALANCE_LIMIT = 500;
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (value) => money.format(Number(value) || 0);

function App() {
  const [balance, setBalance] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [lastKnownBalance, setLastKnownBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadBalance = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await walletService.getBalance();
      const nextBalance = Number(result?.balance);
      if (!Number.isFinite(nextBalance)) throw new Error('Balance response did not contain a valid balance');
      setBalance(nextBalance);
      setLastKnownBalance(nextBalance);
      setFetchedAt(result.fetchedAt || new Date().toISOString());
      setError('');
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load wallet balance');
      setBalance(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadBalance(); }, [loadBalance]);
  useEffect(() => { const timer = setInterval(() => loadBalance(), 300000); return () => clearInterval(timer); }, [loadBalance]);

  const displayedBalance = balance ?? lastKnownBalance;
  const isLow = displayedBalance != null && displayedBalance < LOW_BALANCE_LIMIT;

  return <main className="wallet-page"><header className="wallet-header"><div><p className="eyebrow">IDSPAY / VERIFICATION SERVICES</p><h1>Aadhaar API Wallet</h1><p>Current prepaid Business Wallet balance.</p></div><button className="refresh-button" type="button" onClick={() => loadBalance(true)} disabled={loading || refreshing}>↻ {refreshing ? 'Refreshing…' : 'Refresh'}</button></header><section className={`wallet-card${isLow ? ' is-low' : ''}`} aria-live="polite"><div className="wallet-card-top"><div><span className="wallet-label">Business Wallet</span><span className="wallet-caption">Available balance</span></div><span className="wallet-icon">₹</span></div>{loading && displayedBalance == null ? <div className="wallet-value loading-value">Loading…</div> : <div className={`wallet-value${isLow ? ' warning-value' : ''}`}>{displayedBalance == null ? 'Balance unavailable' : formatMoney(displayedBalance)}</div>}{isLow && <div className="low-balance-message">Low balance</div>}{error && <div className="balance-error"><strong>Balance unavailable</strong><span>{error}</span>{lastKnownBalance != null && <small>Last known value: {formatMoney(lastKnownBalance)}</small>}</div>}{fetchedAt && !error && <div className="updated-time">Last updated: {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fetchedAt))}</div>}</section></main>;
}

export default App;
