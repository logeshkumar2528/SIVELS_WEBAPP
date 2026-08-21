/**
 * ReportsAnalytics.jsx
 * --------------------
 * Reports & Analytics dashboard page displaying key loan metrics, trend line chart,
 * status funnel, loan amount distribution donut, branch performance, RM performance,
 * top performing products, and insights.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout   from '../../layouts/MainLayout/MainLayout';
import Breadcrumb   from '../../components/Breadcrumb/Breadcrumb';
import Button       from '../../components/Button/Button';
import iconMap      from '../../config/iconMap';
import { ROUTES }   from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS, METRIC_CARDS, FUNNEL_DATA,
  LOAN_DISTRIBUTION_DATA, BRANCH_PERFORMANCE, BRANCH_TOTAL,
  RM_PERFORMANCE, PRODUCT_PERFORMANCE, INSIGHTS
} from './reportsAnalyticsData';
import './ReportsAnalytics.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Reports & Analytics' }
];

function ReportsAnalytics() {
  const [dateRange, setDateRange] = useState('01 Jun 2025 - 05 Jun 2025');
  const [branch, setBranch] = useState('All Branches');
  const [rm, setRm] = useState('All RMs');
  const [loanType, setLoanType] = useState('All Loan Types');
  const navigate = useNavigate();

  const CalendarIcon    = iconMap['Calendar'];
  const FilterIcon      = iconMap['Filter'];
  const DownloadIcon    = iconMap['Download'];
  const ExternalLinkIcon= iconMap['ExternalLink'];
  const RefreshIcon     = iconMap['RefreshCw'];
  const SettingsIcon    = iconMap['Zap']; // or another gear/settings icon

  return (
    <MainLayout
      title="Reports & Analytics"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* ========== TOP FILTER CONTROLS BAR ========== */}
      <div className="ra-filter-bar">
        <div className="ra-filter-controls">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="ra-input"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ paddingRight: '28px', width: '210px' }}
            />
            {CalendarIcon && <CalendarIcon size={14} style={{ position: 'absolute', right: '8px', color: 'var(--color-text-muted)' }} />}
          </div>

          <select className="ra-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="All Branches">All Branches</option>
            <option value="KK Nagar">KK Nagar</option>
            <option value="Vadapalani">Vadapalani</option>
          </select>

          <select className="ra-select" value={rm} onChange={(e) => setRm(e.target.value)}>
            <option value="All RMs">All RMs</option>
            <option value="Kumar">Kumar</option>
            <option value="Suresh Babu">Suresh Babu</option>
          </select>

          <select className="ra-select" value={loanType} onChange={(e) => setLoanType(e.target.value)}>
            <option value="All Loan Types">All Loan Types</option>
            <option value="Personal Loan">Personal Loan</option>
            <option value="Business Loan">Business Loan</option>
          </select>
        </div>

        <div className="ra-filter-actions">
          <Button label="Apply Filters" variant="primary" size="md" icon={FilterIcon && <FilterIcon size={14} />} onClick={() => {}} className="bg-success border-success" />
          <Button label="Export Report" variant="outline" size="md" icon={DownloadIcon && <DownloadIcon size={14} />} onClick={() => {}} />
        </div>
      </div>

      {/* ========== TOP METRICS ROW (5 Cards) ========== */}
      <div className="ra-metrics-grid">
        {METRIC_CARDS.map((m) => {
          const IconComp = iconMap[m.icon];
          return (
            <div key={m.id} className="ra-metric-card">
              <div className={`ra-metric-icon-wrap ${m.color}`}>
                {IconComp && <IconComp size={18} />}
              </div>
              <div className="ra-metric-body">
                <span className="ra-metric-title">{m.title}</span>
                <span className="ra-metric-value">{m.value}</span>
                <span className="ra-metric-trend">{m.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========== MAIN 3-COLUMN 2-ROW DASHBOARD GRID ========== */}
      <div className="ra-main-grid">

        {/* Row 1, Col 1: Applications Trend */}
        <div className="ra-card grid-area-trend">
          <div className="ra-card-header">
            <h3 className="ra-card-title">Applications Trend</h3>
            <select className="ra-select" style={{ height: '30px', fontSize: '11px' }}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="ra-chart-legend">
            <div className="ra-legend-item">
              <span className="ra-legend-line" style={{ backgroundColor: '#3b82f6' }} /> Applications
            </div>
            <div className="ra-legend-item">
              <span className="ra-legend-line" style={{ backgroundColor: '#10b981' }} /> Approved
            </div>
            <div className="ra-legend-item">
              <span className="ra-legend-line" style={{ backgroundColor: '#f59e0b' }} /> Disbursed
            </div>
          </div>

          <svg className="ra-svg-chart" viewBox="0 0 300 130">
            {/* Grid Lines */}
            <line x1="20" y1="20" x2="280" y2="20" stroke="#f1f5f9" strokeDasharray="3" />
            <line x1="20" y1="50" x2="280" y2="50" stroke="#f1f5f9" strokeDasharray="3" />
            <line x1="20" y1="80" x2="280" y2="80" stroke="#f1f5f9" strokeDasharray="3" />
            <line x1="20" y1="110" x2="280" y2="110" stroke="#e2e8f0" />

            {/* Blue Applications Series */}
            <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points="30,75 90,55 150,40 210,65 270,50" />
            <circle cx="30" cy="75" r="3" fill="#3b82f6" /><text x="30" y="70" fontSize="8" textAnchor="middle" fill="#3b82f6">25</text>
            <circle cx="90" cy="55" r="3" fill="#3b82f6" /><text x="90" y="50" fontSize="8" textAnchor="middle" fill="#3b82f6">32</text>
            <circle cx="150" cy="40" r="3" fill="#3b82f6" /><text x="150" y="35" fontSize="8" textAnchor="middle" fill="#3b82f6">38</text>
            <circle cx="210" cy="65" r="3" fill="#3b82f6" /><text x="210" y="60" fontSize="8" textAnchor="middle" fill="#3b82f6">29</text>
            <circle cx="270" cy="50" r="3" fill="#3b82f6" /><text x="270" y="45" fontSize="8" textAnchor="middle" fill="#3b82f6">34</text>

            {/* Green Approved Series */}
            <polyline fill="none" stroke="#10b981" strokeWidth="2" points="30,95 90,90 150,85 210,92 270,88" />
            <circle cx="30" cy="95" r="3" fill="#10b981" /><text x="30" y="90" fontSize="8" textAnchor="middle" fill="#10b981">8</text>
            <circle cx="90" cy="90" r="3" fill="#10b981" /><text x="90" y="85" fontSize="8" textAnchor="middle" fill="#10b981">10</text>
            <circle cx="150" cy="85" r="3" fill="#10b981" /><text x="150" y="80" fontSize="8" textAnchor="middle" fill="#10b981">12</text>
            <circle cx="210" cy="92" r="3" fill="#10b981" /><text x="210" y="87" fontSize="8" textAnchor="middle" fill="#10b981">9</text>
            <circle cx="270" cy="88" r="3" fill="#10b981" /><text x="270" y="83" fontSize="8" textAnchor="middle" fill="#10b981">10</text>

            {/* Orange Disbursed Series */}
            <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points="30,105 90,102 150,98 210,103 270,100" />
            <circle cx="30" cy="105" r="3" fill="#f59e0b" /><text x="30" y="102" fontSize="7" textAnchor="middle" fill="#d97706">5</text>
            <circle cx="90" cy="102" r="3" fill="#f59e0b" /><text x="90" y="99" fontSize="7" textAnchor="middle" fill="#d97706">6</text>
            <circle cx="150" cy="98" r="3" fill="#f59e0b" /><text x="150" y="95" fontSize="7" textAnchor="middle" fill="#d97706">7</text>
            <circle cx="210" cy="103" r="3" fill="#f59e0b" /><text x="210" y="100" fontSize="7" textAnchor="middle" fill="#d97706">5</text>
            <circle cx="270" cy="100" r="3" fill="#f59e0b" /><text x="270" y="97" fontSize="7" textAnchor="middle" fill="#d97706">5</text>

            {/* X Axis Labels */}
            <text x="30" y="124" fontSize="8" fill="#94a3b8" textAnchor="middle">01 Jun</text>
            <text x="90" y="124" fontSize="8" fill="#94a3b8" textAnchor="middle">02 Jun</text>
            <text x="150" y="124" fontSize="8" fill="#94a3b8" textAnchor="middle">03 Jun</text>
            <text x="210" y="124" fontSize="8" fill="#94a3b8" textAnchor="middle">04 Jun</text>
            <text x="270" y="124" fontSize="8" fill="#94a3b8" textAnchor="middle">05 Jun</text>
          </svg>
        </div>

        {/* Row 1, Col 2: Loan Amount Distribution */}
        <div className="ra-card grid-area-distribution">
          <div className="ra-card-header">
            <h3 className="ra-card-title">Loan Amount Distribution</h3>
            <select className="ra-select" style={{ height: '30px', fontSize: '11px' }}>
              <option value="this-month">This Month</option>
            </select>
          </div>

          <div className="ra-donut-body">
            <div className="ra-donut-circle">
              <div className="ra-donut-inner">
                <span>158</span>
                <span className="ra-donut-sub">Applications</span>
              </div>
            </div>

            <div className="ra-donut-legend-list">
              {LOAN_DISTRIBUTION_DATA.map((item) => (
                <div key={item.label} className="ra-dll-item">
                  <div className="ra-dll-row">
                    <span className="ra-dll-dot" style={{ backgroundColor: item.color }} />
                    <span className="ra-dll-text">{item.label}</span>
                  </div>
                  <span className="ra-dll-stats">{item.count} ({item.percent})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 1, Col 3: Branch Performance */}
        <div className="ra-card grid-area-branch">
          <div className="ra-card-header">
            <h3 className="ra-card-title">Branch Performance</h3>
            <select className="ra-select" style={{ height: '30px', fontSize: '11px' }}>
              <option value="this-month">This Month</option>
            </select>
          </div>

          <div className="ra-table-container">
            <table className="ra-mini-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th className="text-center">Applications</th>
                  <th className="text-center">Approved</th>
                  <th className="text-center">Disbursed</th>
                  <th className="text-right">Disbursement (₹)</th>
                </tr>
              </thead>
              <tbody>
                {BRANCH_PERFORMANCE.map((row) => (
                  <tr key={row.branch}>
                    <td>{row.branch}</td>
                    <td className="text-center">{row.apps}</td>
                    <td className="text-center">{row.approved}</td>
                    <td className="text-center">{row.disbursed}</td>
                    <td className="text-right font-semibold">{row.amount}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>{BRANCH_TOTAL.branch}</td>
                  <td className="text-center">{BRANCH_TOTAL.apps}</td>
                  <td className="text-center">{BRANCH_TOTAL.approved}</td>
                  <td className="text-center">{BRANCH_TOTAL.disbursed}</td>
                  <td className="text-right">{BRANCH_TOTAL.amount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 2, Col 1: Applications Status Funnel */}
        <div className="ra-card grid-area-funnel">
          <h3 className="ra-card-title mb-4">Applications Status Funnel</h3>

          <div className="ra-funnel-container">
            <div className="ra-funnel-shape">
              <div className="ra-funnel-layer" style={{ backgroundColor: '#1e3a8a', width: '100%' }}>158</div>
              <div className="ra-funnel-layer" style={{ backgroundColor: '#3b82f6', width: '80%' }}>42</div>
              <div className="ra-funnel-layer" style={{ backgroundColor: '#10b981', width: '60%' }}>32</div>
              <div className="ra-funnel-layer" style={{ backgroundColor: '#f59e0b', width: '45%' }}>28</div>
              <div className="ra-funnel-layer" style={{ backgroundColor: '#8b5cf6', width: '30%' }}>8</div>
            </div>

            <div className="ra-funnel-labels">
              {FUNNEL_DATA.map((item) => (
                <div key={item.label} className="ra-fl-row">
                  <span className="ra-fl-name">{item.label}</span>
                  <div>
                    <span className="ra-fl-val">{item.count}</span>
                    <span className="ra-fl-pct" style={{ marginLeft: '8px' }}>{item.percent}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2, Col 2: RM Performance */}
        <div className="ra-card grid-area-rm">
          <div className="ra-card-header">
            <h3 className="ra-card-title">RM Performance</h3>
            <select className="ra-select" style={{ height: '30px', fontSize: '11px' }}>
              <option value="this-month">This Month</option>
            </select>
          </div>

          <div className="ra-table-container">
            <table className="ra-mini-table">
              <thead>
                <tr>
                  <th>RM Name</th>
                  <th className="text-center">Applications</th>
                  <th className="text-center">Approved</th>
                  <th className="text-center">Disbursed</th>
                  <th className="text-right">Conversion %</th>
                </tr>
              </thead>
              <tbody>
                {RM_PERFORMANCE.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div className="ra-user-cell">
                        <div className="ra-avatar-mini">{row.name.charAt(0)}</div>
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td className="text-center">{row.apps}</td>
                    <td className="text-center">{row.approved}</td>
                    <td className="text-center">{row.disbursed}</td>
                    <td className="text-right font-semibold">{row.conversion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <a href="#rms" className="ra-card-link">
            View All RMs {ExternalLinkIcon && <ExternalLinkIcon size={12} />}
          </a>
        </div>

        {/* Row 2, Col 3: Top Performing Products */}
        <div className="ra-card grid-area-products">
          <div className="ra-card-header">
            <h3 className="ra-card-title">Top Performing Products</h3>
            <select className="ra-select" style={{ height: '30px', fontSize: '11px' }}>
              <option value="this-month">This Month</option>
            </select>
          </div>

          <div className="ra-table-container">
            <table className="ra-mini-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th className="text-center">Applications</th>
                  <th className="text-center">Disbursed</th>
                  <th className="text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCT_PERFORMANCE.map((prod) => (
                  <tr key={prod.name}>
                    <td>{prod.name}</td>
                    <td className="text-center">{prod.apps}</td>
                    <td className="text-center">{prod.disbursed}</td>
                    <td className="text-right font-semibold">{prod.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <a href="#products" className="ra-card-link">
            View All Products {ExternalLinkIcon && <ExternalLinkIcon size={12} />}
          </a>
        </div>

      </div>

      {/* ========== FULL WIDTH: INSIGHTS & HIGHLIGHTS ========== */}
      <div className="ra-insights-card">
        <h3 className="ra-card-title">Insights & Highlights</h3>
        <div className="ra-insights-grid">
          {INSIGHTS.map((item) => {
            const IconComp = iconMap[item.icon];
            return (
              <div key={item.id} className="ra-insight-item">
                <div className={`ra-insight-icon ${item.color}`}>
                  {IconComp && <IconComp size={16} />}
                </div>
                <span>{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="ra-action-bar">
        <Button label="Schedule Report" variant="outline" size="md" icon={CalendarIcon && <CalendarIcon size={15} />} onClick={() => {}} className="text-success border-success" />
        <div className="ra-action-right">
          <Button label="Download Detailed Report" variant="outline" size="md" icon={DownloadIcon && <DownloadIcon size={15} />} onClick={() => {}} className="text-primary border-primary" />
          <Button label="Generate Custom Report" variant="primary" size="md" icon={SettingsIcon && <SettingsIcon size={15} />} onClick={() => {}} className="bg-success border-success" />
        </div>
      </div>

    </MainLayout>
  );
}

export default ReportsAnalytics;
