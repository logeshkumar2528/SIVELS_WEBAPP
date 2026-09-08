import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/StatCard/StatCard';
import iconMap from '../../config/iconMap';
import { ROUTES, buildRoute } from '../../config/routeConfig';
import { getKPIs, getAllDistricts, formatCurrency } from '../../data/backOfficeDummyData';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const kpis = getKPIs();
  const districts = getAllDistricts();

  const MapPinIcon = iconMap['MapPin'] || iconMap['Building2'];
  const UsersIcon = iconMap['Users'];
  const UserCheckIcon = iconMap['UserCheck'] || iconMap['UserRound'];
  const FileTextIcon = iconMap['FileText'];
  const ArrowRightIcon = iconMap['ArrowRight'];
  const WalletIcon = iconMap['Wallet'] || iconMap['BadgeIndianRupee'];

  return (
    <div className="bo-dashboard">
      {/* ==========================================
          SECTION 1 — 4 KPI METRIC CARDS
      ========================================== */}
      <section className="bo-kpi-grid" aria-label="Operational KPI Overview">
        <StatCard
          icon={MapPinIcon && <MapPinIcon size={22} strokeWidth={1.8} />}
          title="Total Districts"
          value={kpis.totalDistricts}
          description="Operational Territories"
          trend="6 Active Districts"
          trendDirection="neutral"
          variant="default"
          onClick={() => navigate(ROUTES.DISTRICTS)}
        />

        <StatCard
          icon={UsersIcon && <UsersIcon size={22} strokeWidth={1.8} />}
          title="Total RMs"
          value={kpis.totalRMs}
          description="Relationship Managers"
          trend="24 Active Staff"
          trendDirection="up"
          variant="success"
          onClick={() => navigate(ROUTES.RMS)}
        />

        <StatCard
          icon={UserCheckIcon && <UserCheckIcon size={22} strokeWidth={1.8} />}
          title="Total Agents"
          value={kpis.totalAgents}
          description="Field Agents in Network"
          trend="88 Field Agents"
          trendDirection="up"
          variant="info"
          onClick={() => navigate(ROUTES.AGENTS)}
        />

        <StatCard
          icon={FileTextIcon && <FileTextIcon size={22} strokeWidth={1.8} />}
          title="Total Customers"
          value={kpis.totalCustomers}
          description="Loan Applications"
          trend="₹18.45 Cr Portfolio"
          trendDirection="up"
          variant="warning"
          onClick={() => navigate(ROUTES.CUSTOMERS)}
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

        <div className="bo-district-grid">
          {districts.map((district) => (
            <div
              key={district.id}
              className="bo-district-card bo-district-card--interactive"
              role="button"
              tabIndex={0}
              onClick={() => navigate(buildRoute.districtDetail(district.id))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(buildRoute.districtDetail(district.id));
                }
              }}
              aria-label={`View operations for ${district.name} district`}
            >
              <div className="bo-district-card-header">
                <div className="bo-district-badge">
                  {MapPinIcon && <MapPinIcon size={14} />}
                  <span>{district.code}</span>
                </div>
                <span className="bo-district-zone">{district.zone}</span>
              </div>

              <h3 className="bo-district-name">{district.name}</h3>
              <p className="bo-district-hq">{district.headquarters}</p>

              <div className="bo-district-stats-grid">
                <div className="bo-stat-box">
                  <span className="bo-stat-box-label">RMs</span>
                  <strong className="bo-stat-box-value">{district.rmCount}</strong>
                </div>
                <div className="bo-stat-box">
                  <span className="bo-stat-box-label">Agents</span>
                  <strong className="bo-stat-box-value">{district.agentCount}</strong>
                </div>
                <div className="bo-stat-box">
                  <span className="bo-stat-box-label">Customers</span>
                  <strong className="bo-stat-box-value">{district.customerCount}</strong>
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
                    style={{ width: `${district.completionRate}%` }}
                  />
                </div>
                <div className="bo-portfolio-footer">
                  <span>{district.completionRate}% Disbursed</span>
                  <span>{district.pendingCount} Pending</span>
                </div>
              </div>

              <div className="bo-district-card-footer">
                <button
                  type="button"
                  className="bo-district-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(buildRoute.districtDetail(district.id));
                  }}
                >
                  <span>View District Details</span>
                  {ArrowRightIcon && <ArrowRightIcon size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
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
              <strong>{formatCurrency(kpis.totalPortfolio)}</strong>
            </div>
            <div className="bo-amount-item is-success">
              <small>Disbursed Amount</small>
              <strong>{formatCurrency(kpis.totalDisbursed)}</strong>
            </div>
            <div className="bo-amount-item is-warning">
              <small>Pending Applications</small>
              <strong>{formatCurrency(kpis.totalPending)}</strong>
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
                <small>Track performance of 24 Relationship Managers</small>
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
                <small>Monitor 88 field agents across Tamil Nadu districts</small>
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
                <small>Manage 412 loan applications and verification flow</small>
              </div>
              {ArrowRightIcon && <ArrowRightIcon size={16} className="bo-qa-arrow" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
