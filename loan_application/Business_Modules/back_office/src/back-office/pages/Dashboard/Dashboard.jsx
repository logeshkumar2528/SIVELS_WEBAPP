import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/StatCard/StatCard';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { useDashboardData } from '../../hooks/useDashboardData';
import './Dashboard.css';

/**
 * Currency formatter for loan amounts.
 */
function formatCurrency(amount) {
  const num = Number(amount);
  if (!amount || isNaN(num) || num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export default function Dashboard() {
  const navigate = useNavigate();

  // 1. Live Data Hook
  const {
    districts,
    rms,
    agents,
    customers,
    metrics,
    loading,
    error,
    refetch,
  } = useDashboardData();

  // 2. Resolved Icons
  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const UsersIcon = iconMap['Users'];
  const UserCheckIcon = iconMap['UserCheck'] || iconMap['UserRound'];
  const FileTextIcon = iconMap['FileText'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const WalletIcon = iconMap['Wallet'] || iconMap['BadgeIndianRupee'];
  const AlertCircleIcon = iconMap['AlertCircle'] || iconMap['AlertTriangle'];
  const RefreshCwIcon = iconMap['RefreshCw'] || iconMap['RotateCcw'];

  return (
    <div className="bo-dashboard">
      {/* Error State Banner */}
      {error && (
        <div className="bo-table-error-container" role="alert">
          <div className="bo-error-flex">
            {AlertCircleIcon && <AlertCircleIcon size={24} className="bo-error-icon" />}
            <div className="bo-error-content">
              <h4>Unable to Load Dashboard Data</h4>
              <p>{error}</p>
            </div>
          </div>
          <button type="button" className="bo-btn-retry" onClick={refetch}>
            {RefreshCwIcon && <RefreshCwIcon size={13} />}
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ==========================================
          SECTION 1 — 4 KPI METRIC CARDS
      ========================================== */}
      <section className="bo-kpi-grid" aria-label="Operational KPI Overview">
        <StatCard
          icon={MapPinIcon && <MapPinIcon size={22} strokeWidth={1.8} />}
          title="Total Districts"
          value={metrics.totalDistricts}
          description="Operational Territories"
          trend={`${metrics.totalDistricts} Active Districts`}
          trendDirection="neutral"
          variant="default"
          onClick={() => navigate(ROUTES.DISTRICTS)}
          loading={loading}
        />

        <StatCard
          icon={UsersIcon && <UsersIcon size={22} strokeWidth={1.8} />}
          title="Total RMs"
          value={metrics.totalRMs}
          description="Relationship Managers"
          trend={`${metrics.totalRMs} Active Staff`}
          trendDirection="up"
          variant="success"
          onClick={() => navigate(ROUTES.RMS)}
          loading={loading}
        />

        <StatCard
          icon={UserCheckIcon && <UserCheckIcon size={22} strokeWidth={1.8} />}
          title="Total Agents"
          value={metrics.totalAgents}
          description="Field Agents in Network"
          trend={`${metrics.totalAgents} Field Agents`}
          trendDirection="up"
          variant="info"
          onClick={() => navigate(ROUTES.AGENTS)}
          loading={loading}
        />

        <StatCard
          icon={FileTextIcon && <FileTextIcon size={22} strokeWidth={1.8} />}
          title="Total Customers"
          value={metrics.totalCustomers}
          description="Loan Applications"
          trend={`${formatCurrency(metrics.totalPortfolio)} Portfolio`}
          trendDirection="up"
          variant="warning"
          onClick={() => navigate(ROUTES.CUSTOMERS)}
          loading={loading}
        />
      </section>

      {/* ==========================================
          SECTION 2 — DISTRICT OVERVIEW PREVIEW & DRILL-DOWN
      ========================================== */}
      <section className="bo-section" aria-label="District Operations Preview">
        <div className="bo-section-header">
          <div>
            <h2 className="bo-section-title">District Operations Preview</h2>
            <p className="bo-section-subtitle">Click any district to view detailed Relationship Managers and Agent allocations</p>
          </div>
          <button
            type="button"
            className="bo-btn bo-btn--outline"
            onClick={() => navigate(ROUTES.DISTRICTS)}
          >
            <span>View All Districts</span>
            {ArrowRightIcon && <ArrowRightIcon size={16} />}
          </button>
        </div>

        {loading && districts.length === 0 ? (
          <div className="bo-table-loading-container" aria-live="polite">
            <div className="bo-loading-spinner" aria-hidden="true" />
            <p className="bo-loading-text">Loading district operations overview...</p>
          </div>
        ) : (
          <div className="bo-district-grid">
            {districts.map((district) => {
              const targetId = district.districtId || district.id;
              const code = district.code || district.districtCode || (district.name ? district.name.substring(0, 3).toUpperCase() : 'DST');
              const zone = district.zone || 'Tamil Nadu Zone';
              const hq = district.headquarters || `${district.name} Main Branch`;
              const completionRate = district.completionRate || 0;
              const pendingCount = district.pendingCount || 0;

              return (
                <div
                  key={targetId}
                  className="bo-district-card bo-district-card--interactive"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (targetId) {
                      navigate(buildRoute.districtDetail(targetId));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (targetId) {
                        navigate(buildRoute.districtDetail(targetId));
                      }
                    }
                  }}
                  aria-label={`View operations for ${district.name} district`}
                >
                  <div className="bo-district-card-header">
                    <div className="bo-district-badge">
                      {MapPinIcon && <MapPinIcon size={14} />}
                      <span>{code}</span>
                    </div>
                    <span className="bo-district-zone">{zone}</span>
                  </div>

                  <h3 className="bo-district-name">{district.name}</h3>
                  <p className="bo-district-hq">{hq}</p>

                  <div className="bo-district-stats-grid">
                    <div className="bo-stat-box">
                      <span className="bo-stat-box-label">RMs</span>
                      <strong className="bo-stat-box-value">{district.rmCount ?? 0}</strong>
                    </div>
                    <div className="bo-stat-box">
                      <span className="bo-stat-box-label">Agents</span>
                      <strong className="bo-stat-box-value">{district.agentCount ?? 0}</strong>
                    </div>
                    <div className="bo-stat-box">
                      <span className="bo-stat-box-label">Customers</span>
                      <strong className="bo-stat-box-value">{district.customerCount ?? 0}</strong>
                    </div>
                  </div>

                  <div className="bo-district-portfolio">
                    <div className="bo-portfolio-row">
                      <span>Portfolio Volume</span>
                      <strong>{formatCurrency(district.totalPortfolio)}</strong>
                    </div>
                    <div className="bo-progress-track">
                      <div
                        className="bo-progress-fill"
                        style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
                      />
                    </div>
                    <div className="bo-portfolio-footer">
                      <span>{completionRate}% Disbursed</span>
                      <span>{pendingCount} Pending</span>
                    </div>
                  </div>

                  <div className="bo-district-card-footer">
                    <button
                      type="button"
                      className="bo-district-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (targetId) {
                          navigate(buildRoute.districtDetail(targetId));
                        }
                      }}
                    >
                      <span>View District Details</span>
                      {ArrowRightIcon && <ArrowRightIcon size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ==========================================
          SECTION 3 — OPERATIONAL SNAPSHOT & QUICK ACTIONS
      ========================================== */}
      <section className="bo-summary-panel">
        <div className="bo-summary-card">
          <div className="bo-summary-card-header">
            <div className="bo-summary-icon bo-summary-icon--green">
              {WalletIcon && <WalletIcon size={20} />}
            </div>
            <div>
              <h3>Total Portfolio Allocation</h3>
              <p>Active disbursements and pipeline volume</p>
            </div>
          </div>
          <div className="bo-summary-amounts">
            <div className="bo-amount-item">
              <small>Total Pipeline</small>
              <strong>{formatCurrency(metrics.totalPortfolio)}</strong>
            </div>
            <div className="bo-amount-item is-success">
              <small>Disbursed Amount</small>
              <strong>{formatCurrency(metrics.disbursedAmount || metrics.totalDisbursed)}</strong>
            </div>
            <div className="bo-amount-item is-warning">
              <small>Pending Applications</small>
              <strong>{formatCurrency(metrics.pendingPipelineAmount || metrics.totalPending)}</strong>
            </div>
          </div>
        </div>

        <div className="bo-quick-actions-card">
          <h3>Operations Navigation</h3>
          <p>Quick access to operational monitoring consoles</p>
          <div className="bo-quick-actions-list">
            <button
              type="button"
              className="bo-quick-action-item"
              onClick={() => navigate(ROUTES.RMS)}
            >
              <div className="bo-qa-icon">
                {UsersIcon && <UsersIcon size={18} />}
              </div>
              <div className="bo-qa-text">
                <strong>RM Monitoring Console</strong>
                <small>Track performance of {metrics.totalRMs || 0} Relationship Managers</small>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} className="bo-qa-arrow" />}
            </button>

            <button
              type="button"
              className="bo-quick-action-item"
              onClick={() => navigate(ROUTES.AGENTS)}
            >
              <div className="bo-qa-icon">
                {UserCheckIcon && <UserCheckIcon size={18} />}
              </div>
              <div className="bo-qa-text">
                <strong>Agent Network Operations</strong>
                <small>Monitor {metrics.totalAgents || 0} field agents across Tamil Nadu districts</small>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} className="bo-qa-arrow" />}
            </button>

            <button
              type="button"
              className="bo-quick-action-item"
              onClick={() => navigate(ROUTES.CUSTOMERS)}
            >
              <div className="bo-qa-icon">
                {FileTextIcon && <FileTextIcon size={18} />}
              </div>
              <div className="bo-qa-text">
                <strong>Customer Applications Queue</strong>
                <small>Manage {metrics.totalCustomers || 0} loan applications and verification flow</small>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} className="bo-qa-arrow" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

