import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLoggedInUser, walletService } from './api/walletService';
import { buildDailyUsageAxis } from './usage';

const LOW_BALANCE_LIMIT = 500;
const VERIFICATION_COST = 3.54;
const VERIFICATION_BASE_COST = 3;
const VERIFICATION_GST_RATE = 0.18;
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat('en-IN');
const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const longDate = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatMoney = (value) => money.format(Number(value) || 0);
const toDate = (value) => value ? new Date(value) : null;
const formatDateTime = (value) => { const date = toDate(value); return date && !Number.isNaN(date.valueOf()) ? dateTime.format(date) : '—'; };

const Icon = ({ children, size = 18, className = '' }) => (
  <svg className={`wl-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const RefreshIcon = (p) => <Icon {...p}><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M3 21v-5h5" /></Icon>;
const SyncIcon = (p) => <Icon {...p}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></Icon>;
const ActivityIcon = (p) => <Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icon>;
const LayersIcon = (p) => <Icon {...p}><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></Icon>;
const TagIcon = (p) => <Icon {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7" cy="7" r="1.5" /></Icon>;
const InfoIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Icon>;
const AlertIcon = (p) => <Icon {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Icon>;
const CheckIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></Icon>;
const LockIcon = (p) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>;
const CloseIcon = (p) => <Icon {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>;
const ShieldIcon = (p) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></Icon>;
const ArrowLeftIcon = (p) => <Icon {...p}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></Icon>;

function BalanceAmount({ value }) {
  const parts = money.formatToParts(Number(value) || 0);
  const symbol = parts.filter((p) => p.type === 'currency').map((p) => p.value).join('');
  const whole = parts.filter((p) => ['integer', 'group', 'minusSign'].includes(p.type)).map((p) => p.value).join('');
  const fraction = parts.filter((p) => p.type === 'fraction').map((p) => p.value).join('');
  return (
    <span className="wl-amount">
      <span className="wl-amount-symbol">{symbol}</span>
      <span className="wl-amount-whole">{whole}</span>
      {fraction && <span className="wl-amount-fraction">.{fraction}</span>}
    </span>
  );
}

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

  const handleBackToDashboard = () => {
    window.location.assign('/master/dashboard');
  };

  const openSync = () => { setSyncValue(summary?.baselineBalance ?? ''); setSyncConfirm(false); setSuccess(''); setSyncOpen(true); };
  const saveBaseline = async () => { const amount = Number(syncValue); if (!Number.isFinite(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(String(syncValue))) return; setSaving(true); setError(''); try { await walletService.setBaseline(amount); setSyncOpen(false); setSuccess('Starting balance updated successfully.'); await load(true); } catch (e) { setError(e.message || 'Unable to update wallet baseline'); } finally { setSaving(false); } };

  const rawDailyUsage = Array.isArray(summary?.dailyUsage) ? summary.dailyUsage : [];
  const daily = useMemo(() => buildDailyUsageAxis(rawDailyUsage), [summary]);
  const [dailyDateFilter, setDailyDateFilter] = useState('');
  const [dailyMonthFilter, setDailyMonthFilter] = useState('');
  const filteredDaily = useMemo(() => daily.filter((item) => {
    const matchesDate = !dailyDateFilter || item.key === dailyDateFilter;
    const matchesMonth = !dailyMonthFilter || item.key.slice(0, 7) === dailyMonthFilter;
    return matchesDate && matchesMonth;
  }), [daily, dailyDateFilter, dailyMonthFilter]);
  const totalCalls = filteredDaily.reduce((sum, item) => sum + item.calls, 0), totalCost = filteredDaily.reduce((sum, item) => sum + item.cost, 0);
  const hasUsageRows = rawDailyUsage.length > 0;
  const hasRenderableUsage = daily.some((item) => item.calls > 0 || item.cost > 0);
  if (import.meta.env.DEV && hasUsageRows && !hasRenderableUsage) console.warn('[AadhaarWallet] dailyUsage did not match the local 14-day axis:', rawDailyUsage);

  if (loading) {
    return (
      <main className="wl-page" aria-busy="true">
        <div className="wl-skeleton wl-skeleton-header" />
        <div className="wl-skeleton-hero"><i className="wl-skeleton" /><i className="wl-skeleton" /></div>
        <div className="wl-skeleton-stats"><i className="wl-skeleton" /><i className="wl-skeleton" /><i className="wl-skeleton" /></div>
        <div className="wl-skeleton wl-skeleton-chart" />
      </main>
    );
  }

  if (access && !access.hasAccess) {
    return (
      <main className="wl-page wl-page-center">
        <div className="wl-state-card">
          <span className="wl-state-icon"><LockIcon size={26} /></span>
          <h1>You do not have access to this page</h1>
          <p>Your account is not permitted to view the Business Wallet. Contact your administrator if you need access.</p>
        </div>
      </main>
    );
  }

  const needsBaseline = Boolean(summary?.needsBaseline), balance = Number(summary?.estimatedBalance), low = !needsBaseline && balance < LOW_BALANCE_LIMIT;
  const remainingVerifications = !summary || needsBaseline || !Number.isFinite(balance) ? null : Math.max(0, Math.floor(balance / VERIFICATION_COST));
  const status = !summary
    ? { tone: 'neutral', label: 'Unavailable' }
    : needsBaseline
    ? { tone: 'neutral', label: 'Setup required' }
    : low ? { tone: 'warning', label: 'Low balance' } : { tone: 'success', label: 'Healthy' };
  const todayKey = daily[daily.length - 1]?.key;

  return (
    <main className="wl-page">
      {error && (
        <div className="wl-alert wl-alert-error" role="alert">
          <AlertIcon size={20} />
          <div className="wl-alert-body"><strong>Unable to update wallet</strong><p>{error}</p></div>
          <button type="button" className="wl-btn wl-btn-danger-ghost" onClick={() => load(true)}>Retry</button>
        </div>
      )}
      {success && (
        <div className="wl-alert wl-alert-success" role="status">
          <CheckIcon size={20} />
          <div className="wl-alert-body"><strong>{success}</strong></div>
        </div>
      )}

      <header className="wl-header">
        <div className="wl-header-text">
          <button
            type="button"
            className="wl-btn wl-btn-outline wl-back-btn"
            onClick={handleBackToDashboard}
            aria-label="Back to Dashboard"
          >
            <ArrowLeftIcon size={16} />
            <span>Back to Dashboard</span>
          </button>
          <nav className="wl-breadcrumb" aria-label="Breadcrumb">
            <span>IDSPay</span><span className="wl-breadcrumb-sep">/</span><span>Verification Services</span>
          </nav>
          <h1>Aadhaar API Wallet</h1>
        </div>
        <div className="wl-header-actions">
        </div>
      </header>

      {low && (
        <div className="wl-alert wl-alert-warning" role="status">
          <AlertIcon size={20} />
          <div className="wl-alert-body">
            <strong>Low balance — top up the IDSPay wallet soon</strong>
            <p>The estimated balance is below {formatMoney(LOW_BALANCE_LIMIT)}. Sync the portal balance after topping up.</p>
          </div>
        </div>
      )}

      <section className="wl-overview">
        <div className={`wl-balance-card${low ? ' is-low' : ''}`}>
          <div className="wl-balance-top">
            <div className="wl-balance-label">
              Balance
            </div>
          </div>
          {needsBaseline
            ? <div className="wl-balance-empty">Enter the starting balance to begin</div>
            : <div className="wl-balance-value"><BalanceAmount value={balance} /></div>}
          <div className="wl-balance-actions">
            <button type="button" className="wl-btn wl-btn-light" onClick={openSync}>
              <SyncIcon size={16} />
              {needsBaseline ? 'Enter starting balance' : 'Sync with portal balance'}
            </button>
          </div>
        </div>

        <aside className="wl-health-card">
          <div className="wl-card-head">
            <h2>Wallet health</h2>
            <span className={`wl-pill wl-pill-${status.tone}`}><span className={`wl-dot wl-dot-${status.tone}`} />{status.label}</span>
          </div>
          <dl className="wl-health-list">
            <div>
              <dt>Verifications remaining</dt>
              <dd>{remainingVerifications === null ? '—' : `≈ ${count.format(remainingVerifications)}`}</dd>
            </div>
            <div>
              <dt>Low-balance alert</dt>
              <dd>Below {formatMoney(LOW_BALANCE_LIMIT)}</dd>
            </div>
            <div>
              <dt>Verifications since sync</dt>
              <dd>{count.format(summary?.callsSinceSync ?? 0)}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="wl-stats">
        <article className="wl-stat">
          <span className="wl-stat-icon wl-tone-rose"><ActivityIcon size={18} /></span>
          <div>
            <span className="wl-stat-label">Used since last sync</span>
            <strong className="wl-stat-value">{formatMoney(summary?.usedSinceSync)}</strong>
            <span className="wl-stat-meta">{summary?.callsSinceSync ?? 0} verifications</span>
          </div>
        </article>
        <article className="wl-stat">
          <span className="wl-stat-icon wl-tone-green"><LayersIcon size={18} /></span>
          <div>
            <span className="wl-stat-label">Starting balance</span>
            <strong className="wl-stat-value">{formatMoney(summary?.baselineBalance)}</strong>
            <span className="wl-stat-meta">Synced {formatDateTime(summary?.baselineSyncedAt)}</span>
          </div>
        </article>
        <article className="wl-stat">
          <span className="wl-stat-icon wl-tone-blue"><TagIcon size={18} /></span>
          <div>
            <span className="wl-stat-label">Cost per verification</span>
            <strong className="wl-stat-value">{formatMoney(VERIFICATION_COST)}</strong>
            <span className="wl-stat-meta">₹3.00 + 18% GST</span>
          </div>
        </article>
      </section>

      <section className="wl-usage-card">
        <div className="wl-usage-head">
          <div>
            <h2>Daily breakdown</h2>
          </div>
          <div className="wl-usage-filters" aria-label="Daily breakdown filters">
            <label>
              <span>Date</span>
              <input type="date" value={dailyDateFilter} onChange={(event) => setDailyDateFilter(event.target.value)} />
            </label>
            <label>
              <span>Month</span>
              <input type="month" value={dailyMonthFilter} onChange={(event) => setDailyMonthFilter(event.target.value)} />
            </label>
            {(dailyDateFilter || dailyMonthFilter) && (
              <button
                type="button"
                className="wl-btn wl-btn-outline wl-filter-clear"
                onClick={() => { setDailyDateFilter(''); setDailyMonthFilter(''); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {!hasUsageRows ? (
          <div className="wl-empty">
            <span className="wl-empty-icon"><ActivityIcon size={24} /></span>
            <strong>No activity yet</strong>
            <p>No verification usage recorded in the last 14 days.</p>
          </div>
        ) : !hasRenderableUsage ? (
          <div className="wl-alert wl-alert-warning wl-inline-alert"><AlertIcon size={18} /><div className="wl-alert-body"><p>Daily usage was received, but no valid rows could be displayed.</p></div></div>
        ) : filteredDaily.length === 0 ? (
          <div className="wl-empty">
            <span className="wl-empty-icon"><ActivityIcon size={24} /></span>
            <strong>No matching activity</strong>
            <p>No daily usage matches the selected date or month.</p>
          </div>
        ) : (
          <>
            <div className="wl-table-wrap">
              <table className="wl-table">
                <thead>
                  <tr><th>Date</th><th>Day</th><th className="wl-center">No. of Aadhaar verified</th><th className="wl-center">Cost per verification</th><th className="wl-num">GST</th><th className="wl-num">Total</th></tr>
                </thead>
                <tbody>
                  {[...filteredDaily].reverse().map((item) => (
                    <tr key={`table-${item.key}`} className={item.calls === 0 ? 'is-muted' : ''}>
                      <td>{longDate.format(item.date)}{item.key === todayKey && <span className="wl-pill wl-pill-neutral wl-pill-sm">Today</span>}</td>
                      <td>{weekday.format(item.date)}</td>
                      <td className="wl-center">{item.calls}</td>
                      <td className="wl-center wl-cost">{formatMoney(item.calls * VERIFICATION_BASE_COST)}</td>
                      <td className="wl-num wl-cost">{formatMoney(item.calls * VERIFICATION_BASE_COST * VERIFICATION_GST_RATE)}</td>
                      <td className="wl-num wl-cost">{formatMoney(item.cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={2}>Total</td><td className="wl-center">{totalCalls}</td><td className="wl-center">{formatMoney(totalCalls * VERIFICATION_BASE_COST)}</td><td className="wl-num">{formatMoney(totalCalls * VERIFICATION_BASE_COST * VERIFICATION_GST_RATE)}</td><td className="wl-num">{formatMoney(totalCost)}</td></tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      {syncOpen && (
        <div className="wl-modal-backdrop" role="presentation">
          <div className="wl-modal" role="dialog" aria-modal="true" aria-labelledby="sync-title">
            <button type="button" className="wl-modal-close" onClick={() => setSyncOpen(false)} aria-label="Close"><CloseIcon size={18} /></button>
            <span className="wl-modal-icon"><SyncIcon size={20} /></span>
            <h2 id="sync-title">Sync portal balance</h2>
            <p>Enter the Business Wallet balance shown on the IDSPay portal. Do this after every top-up, and whenever the estimate looks wrong.</p>
            {!syncConfirm ? (
              <>
                <label htmlFor="sync-balance">Portal balance</label>
                <div className="wl-input-group">
                  <span className="wl-input-prefix">₹</span>
                  <input id="sync-balance" type="number" min="0" step="0.01" value={syncValue} onChange={(event) => setSyncValue(event.target.value)} placeholder="0.00" autoFocus />
                </div>
                <span className="wl-input-hint">Up to 2 decimal places.</span>
                <div className="wl-modal-actions">
                  <button type="button" className="wl-btn wl-btn-outline" onClick={() => setSyncOpen(false)}>Cancel</button>
                  <button type="button" className="wl-btn wl-btn-primary" disabled={!syncValue || Number(syncValue) < 0} onClick={() => setSyncConfirm(true)}>Continue</button>
                </div>
              </>
            ) : (
              <>
                <div className="wl-confirm">
                  <span>New starting balance</span>
                  <strong>{formatMoney(syncValue)}</strong>
                  <small>The estimate will be recalculated from this amount.</small>
                </div>
                <div className="wl-modal-actions">
                  <button type="button" className="wl-btn wl-btn-outline" onClick={() => setSyncConfirm(false)}>Back</button>
                  <button type="button" className="wl-btn wl-btn-primary" onClick={saveBaseline} disabled={saving}>{saving ? 'Saving…' : 'Confirm sync'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
