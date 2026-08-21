/**
 * DisbursementHistory.jsx
 * --------------------
 * Disbursement History page showing overall summary metrics, filterable history table,
 * selected transaction details, trend charts, and activity log.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout   from '../../layouts/MainLayout/MainLayout';
import Breadcrumb   from '../../components/Breadcrumb/Breadcrumb';
import Button       from '../../components/Button/Button';
import Pagination   from '../../components/Pagination/Pagination';
import iconMap      from '../../config/iconMap';
import { ROUTES }   from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS, METRIC_CARDS, DISBURSEMENT_TABLE_DATA,
  RECENT_ACTIVITIES, OVERVIEW_STATS
} from './disbursementHistoryData';
import './DisbursementHistory.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Disbursement',          path: ROUTES.DISBURSEMENT },
  { label: 'Disbursement History' }
];

function DisbursementHistory() {
  const [selectedAppId, setSelectedAppId] = useState('APP25060500020');
  const [dateRange, setDateRange] = useState('01 Jun 2025 - 05 Jun 2025');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [appliedFilters, setAppliedFilters] = useState({
    dateRange: '01 Jun 2025 - 05 Jun 2025',
    branchFilter: 'All Branches',
    statusFilter: 'All',
    searchTerm: ''
  });

  const handleApplyFilters = () => {
    setAppliedFilters({ dateRange, branchFilter, statusFilter, searchTerm });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setDateRange('01 Jun 2025 - 05 Jun 2025');
    setBranchFilter('All Branches');
    setStatusFilter('All');
    setSearchTerm('');
    setAppliedFilters({
      dateRange: '01 Jun 2025 - 05 Jun 2025',
      branchFilter: 'All Branches',
      statusFilter: 'All',
      searchTerm: ''
    });
    setCurrentPage(1);
  };

  const filteredData = DISBURSEMENT_TABLE_DATA.filter(item => {
    if (appliedFilters.branchFilter !== 'All Branches' && item.branch !== appliedFilters.branchFilter) return false;
    if (appliedFilters.statusFilter !== 'All' && item.status !== appliedFilters.statusFilter) return false;
    if (appliedFilters.searchTerm) {
      const q = appliedFilters.searchTerm.toLowerCase();
      if (!item.id.toLowerCase().includes(q) && !item.customerName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedItem = DISBURSEMENT_TABLE_DATA.find(d => d.id === selectedAppId) || DISBURSEMENT_TABLE_DATA[0];

  const ArrowLeftIcon  = iconMap['ArrowLeft'];
  const DownloadIcon   = iconMap['Download'];
  const RefreshIcon    = iconMap['RefreshCw'];
  const SearchIcon      = iconMap['Search'];
  const EyeIcon         = iconMap['Eye'];
  const CalendarIcon    = iconMap['Calendar'];
  const CheckCircleIcon = iconMap['CheckCircle2'];
  const ShieldIcon      = iconMap['ShieldCheck'];
  const MoreIcon        = iconMap['MoreVertical'];
  const ExternalLinkIcon= iconMap['ExternalLink'];

  return (
    <MainLayout
      title="Disbursement History"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <Breadcrumb items={BREADCRUMB_ITEMS} />

      {/* ========== TOP METRICS ROW (5 Cards) ========== */}
      <div className="dh-metrics-grid">
        {METRIC_CARDS.map((m) => {
          const IconComp = iconMap[m.icon];
          return (
            <div key={m.id} className="dh-metric-card">
              <div className={`dh-metric-icon-wrap ${m.color}`}>
                {IconComp && <IconComp size={18} />}
              </div>
              <div className="dh-metric-body">
                <span className="dh-metric-title">{m.title}</span>
                <span className="dh-metric-value">{m.value}</span>
                <span className="dh-metric-subtext">{m.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========== MAIN 2-COLUMN SECTION ========== */}
      <div className="dh-main-grid">

        {/* ---------- LEFT COLUMN: Table & Filters ---------- */}
        <div className="dh-left-section">
          
          <div className="dh-card">
            
            {/* Filter Bar */}
            <div className="dh-filter-bar">
              <div className="dh-filter-group">
                <div className="dh-filter-item">
                  <span className="dh-filter-label">Date Range</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input type="text" className="dh-input" value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ paddingRight: '26px' }} />
                    <CalendarIcon size={14} style={{ position: 'absolute', right: '8px', color: 'var(--color-text-muted)' }} />
                  </div>
                </div>

                <div className="dh-filter-item">
                  <span className="dh-filter-label">Branch</span>
                  <select className="dh-select" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                    <option value="All Branches">All Branches</option>
                    <option value="KK Nagar">KK Nagar</option>
                    <option value="Anna Nagar">Anna Nagar</option>
                  </select>
                </div>

                <div className="dh-filter-item">
                  <span className="dh-filter-label">Disbursement Status</span>
                  <select className="dh-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All</option>
                    <option value="Success">Success</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="dh-filter-group">
                <div className="dh-search-wrap">
                  <input
                    type="text"
                    className="dh-input dh-search-input"
                    placeholder="Search by Name / Application ID"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {SearchIcon && <SearchIcon size={14} className="dh-search-icon" />}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                  <Button label="Clear" variant="outline" size="sm" icon={RefreshIcon && <RefreshIcon size={12} />} onClick={handleClearFilters} />
                  <Button label="Apply" variant="primary" size="sm" icon={SearchIcon && <SearchIcon size={12} />} onClick={handleApplyFilters} />
                  <Button label="Export" variant="outline" size="sm" icon={DownloadIcon && <DownloadIcon size={14} />} onClick={() => {}} />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="dh-table-wrap">
              <table className="dh-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Application ID</th>
                    <th>Customer Name</th>
                    <th>Disbursed Amount</th>
                    <th>Disbursed On</th>
                    <th>Disbursed To</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => {
                    const isSelected = row.id === selectedAppId;
                    return (
                      <tr 
                        key={row.id} 
                        className={isSelected ? 'selected-row' : ''}
                        onClick={() => setSelectedAppId(row.id)}
                      >
                        <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="font-semibold text-primary">{row.id}</td>
                        <td>{row.customerName}</td>
                        <td className="font-semibold">{row.amount}</td>
                        <td>{row.disbursedOn}</td>
                        <td>{row.disbursedTo}</td>
                        <td>
                          <span className={`dh-status-badge ${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
                        <td>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                            {MoreIcon && <MoreIcon size={14} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredData.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            />

          </div>

          {/* Security Banner */}
          <div className="dh-security-banner">
            {ShieldIcon && <ShieldIcon size={28} className="dh-sec-icon" />}
            <div>
              <h4 className="dh-sec-title">All disbursements are secure and tracked</h4>
              <p className="dh-sec-desc">Loan amounts are transferred directly to customer's verified bank accounts. All transactions are encrypted and audited.</p>
            </div>
          </div>

        </div>

        {/* ---------- RIGHT COLUMN: Selected Details, Chart, Activity ---------- */}
        <div className="dh-right-section">

          {/* Selected Transaction Details */}
          <div className="dh-card">
            <h3 className="dh-card-title">
              {iconMap['FileText'] && <iconMap.FileText size={16} className="text-success" />}
              Disbursement Details
            </h3>

            <div className="dh-details-grid">
              <div className="dh-details-fields">
                <div className="dh-df-row">
                  <span className="dh-df-label">Application ID</span>
                  <span className="dh-df-val text-primary">{selectedItem.id}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Customer Name</span>
                  <span className="dh-df-val">{selectedItem.customerName}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Sanctioned Amount</span>
                  <span className="dh-df-val">{selectedItem.amount}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Disbursed Amount</span>
                  <span className="dh-df-val text-success">{selectedItem.actualDisbursed}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Processing Fee</span>
                  <span className="dh-df-val">{selectedItem.processingFee}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Disbursed On</span>
                  <span className="dh-df-val">{selectedItem.disbursedOn}, 11:32 AM</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Disbursed To</span>
                  <span className="dh-df-val">{selectedItem.disbursedTo} - {selectedItem.accountNo}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">UTR / Reference No.</span>
                  <span className="dh-df-val">{selectedItem.utr}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Disbursement Mode</span>
                  <span className="dh-df-val">{selectedItem.mode}</span>
                </div>
                <div className="dh-df-row">
                  <span className="dh-df-label">Remarks</span>
                  <span className="dh-df-val">{selectedItem.remarks}</span>
                </div>
              </div>

              <div className="dh-status-box-wrap">
                <div className="dh-status-pill">
                  <div>
                    <span className="dh-sp-title">Disbursement Status</span>
                    <div className="dh-sp-val">{selectedItem.status}</div>
                  </div>
                  {CheckCircleIcon && <CheckCircleIcon size={20} className="text-success" />}
                </div>

                <div className="dh-bank-confirm-box">
                  <div className="dh-bc-header">
                    🏦 Bank Confirmation
                  </div>
                  <div className="dh-bc-row">
                    {CheckCircleIcon && <CheckCircleIcon size={12} className="text-success" style={{ flexShrink: 0, marginTop: '2px' }} />}
                    <div>
                      <p className="dh-bc-text">Payment received by bank</p>
                      <span className="dh-bc-date">{selectedItem.bankTime}</span>
                    </div>
                  </div>
                </div>

                <button className="dh-proof-btn">
                  {EyeIcon && <EyeIcon size={14} />}
                  View Transaction Proof
                </button>
              </div>
            </div>
          </div>

          {/* Disbursement Overview Chart Card */}
          <div className="dh-card">
            <div className="dh-card-header">
              <h3 className="dh-card-title">
                {iconMap['BarChart2'] && <iconMap.BarChart2 size={16} className="text-primary" />}
                Disbursement Overview
              </h3>
              <select className="dh-select" style={{ height: '30px', fontSize: '11px' }}>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
              </select>
            </div>

            <div className="dh-overview-body">
              {/* Line Trend SVG */}
              <div className="dh-chart-mock">
                <span className="dh-chart-title">Disbursed Amount Trend (₹)</span>
                <svg className="dh-line-chart-svg" viewBox="0 0 200 90">
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    points="10,70 50,60 90,45 130,55 170,20"
                  />
                  <circle cx="10" cy="70" r="3" fill="#10b981" />
                  <circle cx="50" cy="60" r="3" fill="#10b981" />
                  <circle cx="90" cy="45" r="3" fill="#10b981" />
                  <circle cx="130" cy="55" r="3" fill="#10b981" />
                  <circle cx="170" cy="20" r="4" fill="#10b981" />
                  {/* Tooltip mockup */}
                  <rect x="135" y="5" width="60" height="20" rx="3" fill="#ffffff" stroke="#e2e8f0" />
                  <text x="140" y="14" fontSize="7" fill="#64748b">05 Jun</text>
                  <text x="140" y="21" fontSize="7" fontWeight="bold" fill="#0f172a">₹ 32,45,000</text>
                </svg>
              </div>

              {/* Donut Chart */}
              <div className="dh-donut-wrap">
                <div className="dh-donut-circle">
                  <div className="dh-donut-inner">
                    <span>{OVERVIEW_STATS.totalCount}</span>
                    <span style={{ fontSize: '8px', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>Total</span>
                  </div>
                </div>

                <div className="dh-donut-legend">
                  {OVERVIEW_STATS.breakdown.map((item) => (
                    <div key={item.label} className="dh-legend-item">
                      <span className="dh-legend-dot" style={{ backgroundColor: item.color }} />
                      <span className="dh-legend-label">{item.label}</span>
                      <span className="dh-legend-stats">{item.count} ({item.percent})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities Card */}
          <div className="dh-card">
            <h3 className="dh-card-title">
              {iconMap['Clock'] && <iconMap.Clock size={16} className="text-primary" />}
              Recent Disbursement Activities
            </h3>

            <div className="dh-activity-list mt-3">
              {RECENT_ACTIVITIES.map((act) => {
                const IconComp = iconMap[act.icon];
                return (
                  <div key={act.id} className="dh-act-item">
                    <div className="dh-act-icon">
                      {IconComp && <IconComp size={16} className={`text-${act.color}`} />}
                    </div>
                    <div>
                      <p className="dh-act-title">{act.title}</p>
                      <span className="dh-act-meta">{act.time} • {act.by}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <a href="#activities" className="dh-view-all-link">
              View All Activities {ExternalLinkIcon && <ExternalLinkIcon size={12} />}
            </a>
          </div>

        </div>

      </div>

      {/* ========== BOTTOM ACTION BAR ========== */}
      <div className="dh-action-bar">
        <Button label="Return to Dashboard" variant="outline" size="md" icon={ArrowLeftIcon && <ArrowLeftIcon size={15} />} onClick={() => navigate(ROUTES.DASHBOARD)} className="text-danger border-danger" />
        <div className="dh-action-right">
          <Button label="Download Report" variant="outline" size="md" icon={DownloadIcon && <DownloadIcon size={15} />} onClick={() => {}} className="text-warning border-warning" />
          <Button label="Sync with Bank Status" variant="primary" size="md" icon={RefreshIcon && <RefreshIcon size={15} />} onClick={() => {}} className="bg-success border-success" />
        </div>
      </div>

    </MainLayout>
  );
}

export default DisbursementHistory;
