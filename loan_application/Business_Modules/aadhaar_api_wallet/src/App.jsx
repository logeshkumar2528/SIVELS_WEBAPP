import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLoggedInUser, walletService } from './api/walletService';
import { buildDailyUsageAxis } from './usage';

const LOW_BALANCE_LIMIT = 500;
const VERIFICATION_COST = 2.95;
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const shortDate = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
const formatMoney = (value) => money.format(Number(value) || 0);
const toDate = (value) => value ? new Date(value) : null;
const formatDateTime = (value) => { const date = toDate(value); return date && !Number.isNaN(date.valueOf()) ? dateTime.format(date) : '—'; };

function App() {
  const [{ fullName }, setUser] = useState(getLoggedInUser);
  const [access, setAccess] = useState(null), [summary, setSummary] = useState(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [saving, setSaving] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false), [syncValue, setSyncValue] = useState(''), [syncConfirm, setSyncConfirm] = useState(false), [success, setSuccess] = useState('');
  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true); setError('');
    try { const user = getLoggedInUser(); setUser(user); if (!user.mobileNumber) throw new Error('No logged-in mobile number was found'); const result = await walletService.getAccess(user.mobileNumber); setAccess(result); if (result?.hasAccess) setSummary(await walletService.getSummary()); }
    catch (e) { if (e.status === 403) setAccess({ hasAccess: false }); setError(e.message || 'Unable to load wallet data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const timer = setInterval(load, 300000); return () => clearInterval(timer); }, [load]);

  const openSync = () => { setSyncValue(summary?.baselineBalance ?? ''); setSyncConfirm(false); setSuccess(''); setSyncOpen(true); };
  const saveBaseline = async () => { const amount = Number(syncValue); if (!Number.isFinite(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(String(syncValue))) return; setSaving(true); setError(''); try { await walletService.setBaseline(amount); setSyncOpen(false); setSuccess('Starting balance updated successfully.'); await load(true); } catch (e) { setError(e.message || 'Unable to update wallet baseline'); } finally { setSaving(false); } };

  const rawDailyUsage = Array.isArray(summary?.dailyUsage) ? summary.dailyUsage : [];
  const daily = useMemo(() => buildDailyUsageAxis(rawDailyUsage), [summary]);
  const totalCalls = daily.reduce((sum, item) => sum + item.calls, 0), totalCost = daily.reduce((sum, item) => sum + item.cost, 0), maxCalls = Math.max(...daily.map((item) => item.calls), 1);
  const hasUsageRows = rawDailyUsage.length > 0;
  const hasRenderableUsage = daily.some((item) => item.calls > 0 || item.cost > 0);
  if (import.meta.env.DEV && hasUsageRows && !hasRenderableUsage) console.warn('[AadhaarWallet] dailyUsage did not match the local 14-day axis:', rawDailyUsage);

  if (loading) return <main className="wallet-page"><div className="skeleton-header"/><div className="skeleton-hero"/><div className="skeleton-stats"><i/><i/><i/></div><div className="skeleton-chart"/></main>;
  if (access && !access.hasAccess) return <main className="wallet-page"><div className="state-card denied"><span className="state-icon">!</span><h1>You do not have access to this page</h1><p>Your account is not permitted to view the Business Wallet.</p></div></main>;

  const needsBaseline = Boolean(summary?.needsBaseline), balance = Number(summary?.estimatedBalance), low = !needsBaseline && balance < LOW_BALANCE_LIMIT;
  return <main className="wallet-page">
    {error && <div className="top-error" role="alert"><span className="state-icon">!</span><div><strong>Unable to update wallet</strong><p>{error}</p></div><button onClick={() => load(true)}>Retry</button></div>}
    {success && <div className="success-banner" role="status">✓ {success}</div>}
    <header className="wallet-header"><div><p className="eyebrow">IDSPAY / VERIFICATION SERVICES</p><h1>Aadhaar API Wallet</h1><p>IDSPay prepaid wallet - estimated balance</p></div><div className="header-actions"><span>Updated {formatDateTime(summary?.baselineSyncedAt)}</span><button className="refresh-button" onClick={() => load(true)} disabled={refreshing}>↻ {refreshing ? 'Refreshing…' : 'Refresh'}</button></div></header>
    {low && <div className="low-banner"><span className="state-icon">!</span><strong>Low balance - top up the IDSPay wallet soon</strong></div>}
    <section className={`hero-card${low ? ' is-low' : ''}`}><div className="hero-content"><div className="hero-label">Estimated wallet balance <span className="estimate-badge">Estimate</span></div>{needsBaseline ? <div className="needs-baseline">Enter the starting balance to begin</div> : <div className={`hero-value${low ? ' warning-value' : ''}`}>{formatMoney(balance)}</div>}<p>Based on the balance you entered on {formatDateTime(summary?.baselineSyncedAt)} minus verifications since then.</p></div><button className="primary-button" onClick={openSync}>{needsBaseline ? 'Enter starting balance' : 'Sync with portal balance'}</button></section>
    <section className="stats-grid"><div className="stat-card"><span className="stat-label">Used since last sync</span><strong>{formatMoney(summary?.usedSinceSync)}</strong><small>{summary?.callsSinceSync ?? 0} verifications</small></div><div className="stat-card"><span className="stat-label">Starting balance</span><strong>{formatMoney(summary?.baselineBalance)}</strong><small>Synced {formatDateTime(summary?.baselineSyncedAt)}</small></div><div className="stat-card"><span className="stat-label">Cost per verification</span><strong>{formatMoney(VERIFICATION_COST)}</strong><small>Rs 2.50 + 18% GST</small></div></section>
    <section className="usage-card"><div className="section-heading"><div><h2>Last 14 days</h2><p>All verifications, including those before the last sync.</p></div><div className="usage-total"><strong>{totalCalls}</strong><span>verifications</span></div></div>{!hasUsageRows ? <div className="empty-state">No verification usage recorded in the last 14 days.</div> : !hasRenderableUsage ? <div className="usage-inline-error">Daily usage was received, but no valid rows could be displayed.</div> : <><div className="chart" aria-label="Verification calls for the last 14 days">{daily.map((item) => <div className="bar-column" key={item.key} title={`${item.calls} calls · ${formatMoney(item.cost)}`}><span className="bar-value">{item.calls || ''}</span><div className="bar-track"><i style={{ height: `${(item.calls / maxCalls) * 100}%` }}/></div><small>{shortDate.format(item.date)}</small></div>)}</div><div className="usage-table"><div className="table-row table-head"><span>Date</span><span>Calls</span><span>Cost</span></div>{daily.map((item) => <div className="table-row" key={`table-${item.key}`}><span>{item.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span><span>{item.calls}</span><strong>{formatMoney(item.cost)}</strong></div>)}<div className="table-row total-row"><strong>Total</strong><strong>{totalCalls}</strong><strong>{formatMoney(totalCost)}</strong></div></div></>}</section>
    <footer className="wallet-footer">This is an estimate calculated from our own verification log. The IDSPay portal shows the real balance.</footer>
    {syncOpen && <div className="modal-backdrop" role="presentation"><div className="sync-modal" role="dialog" aria-modal="true" aria-labelledby="sync-title"><button className="modal-close" onClick={() => setSyncOpen(false)} aria-label="Close">×</button><h2 id="sync-title">Sync portal balance</h2><p>Enter the Business Wallet balance shown on the IDSPay portal. Do this after every top-up, and whenever the estimate looks wrong.</p>{!syncConfirm ? <><label htmlFor="sync-balance">Portal balance</label><input id="sync-balance" type="number" min="0" step="0.01" value={syncValue} onChange={(event) => setSyncValue(event.target.value)} placeholder="0.00"/><button className="primary-button full-button" disabled={!syncValue || Number(syncValue) < 0} onClick={() => setSyncConfirm(true)}>Continue</button></> : <><div className="confirm-box">Set the starting balance to <strong>{formatMoney(syncValue)}?</strong></div><div className="modal-actions"><button className="secondary-button" onClick={() => setSyncConfirm(false)}>Back</button><button className="primary-button" onClick={saveBaseline} disabled={saving}>{saving ? 'Saving…' : 'Confirm sync'}</button></div></>}</div></div>}
  </main>;
}

export default App;
