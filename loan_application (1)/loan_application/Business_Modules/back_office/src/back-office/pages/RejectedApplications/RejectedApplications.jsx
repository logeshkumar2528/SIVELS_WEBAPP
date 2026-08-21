/**
 * RejectedApplications.jsx
 * --------------------
 * Page for viewing list of rejected loan applications.
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
  CURRENT_USER, BADGE_COUNTS, REJECTED_METRICS, REJECTED_TABLE_DATA
} from './rejectedApplicationsData';
import '../../styles/listingPages.css';
import './RejectedApplications.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Rejected Applications' }
];

function RejectedApplications() {
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [dateRange, setDateRange] = useState('01 Jun 2025 - 05 Jun 2025');
  const [branch, setBranch] = useState('All Branches');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [appliedFilters, setAppliedFilters] = useState({ dateRange: '', branch: 'All Branches', search: '' });

  const navigate = useNavigate();

  const handleApplyFilters = () => {
    setAppliedFilters({ dateRange, branch, search });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setDateRange('01 Jun 2025 - 05 Jun 2025');
    setBranch('All Branches');
    setSearch('');
    setAppliedFilters({ dateRange: '', branch: 'All Branches', search: '' });
    setCurrentPage(1);
  };

  const filteredData = REJECTED_TABLE_DATA.filter(item => {
    if (appliedFilters.branch !== 'All Branches' && item.branch && item.branch !== appliedFilters.branch) return false;
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      if (!item.id.toLowerCase().includes(q) && !item.customerName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedItem = filteredData.find(d => d.id === selectedAppId) || filteredData[0] || {};

  const EyeIcon      = iconMap['Eye'];
  const SearchIcon   = iconMap['Search'];
  const RefreshIcon  = iconMap['RefreshCw'];
  const CalendarIcon = iconMap['Calendar'];
  const AlertIcon    = iconMap['AlertTriangle'];

  return (
    <MainLayout
      title="Rejected Applications"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <div className="listing-page-wrapper">
        <Breadcrumb items={BREADCRUMB_ITEMS} />

        {/* ========== TOP METRIC CARDS ========== */}
        <div className="listing-metrics-grid">
          {REJECTED_METRICS.map((m) => {
            const IconComp = iconMap[m.icon];
            return (
              <div key={m.id} className="listing-metric-card">
                <div className={`listing-metric-icon ${m.color}`}>
                  {IconComp && <IconComp size={16} />}
                </div>
                <div className="listing-metric-body">
                  <span className="listing-metric-title">{m.title}</span>
                  <span className="listing-metric-value">{m.value}</span>
                  <span className="listing-metric-subtext">{m.subtext}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ========== FILTER BAR ========== */}
        <div className="listing-filter-card">
          <div className="listing-filter-bar">
            <div className="listing-filter-group">
              <div className="listing-filter-item">
                <span className="listing-filter-label">Date Range</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="listing-input"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    style={{ paddingRight: '26px', width: '170px' }}
                  />
                  {CalendarIcon && <CalendarIcon size={14} style={{ position: 'absolute', right: '8px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />}
                </div>
              </div>

              <div className="listing-filter-item">
                <span className="listing-filter-label">Branch</span>
                <select className="listing-select" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ width: '130px' }}>
                  <option value="All Branches">All Branches</option>
                  <option value="KK Nagar">KK Nagar</option>
                </select>
              </div>

              <div className="listing-filter-item">
                <span className="listing-filter-label">Search By</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="listing-input"
                    placeholder="Application ID / Customer Name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingRight: '26px', width: '220px' }}
                  />
                  {SearchIcon && <SearchIcon size={14} style={{ position: 'absolute', right: '8px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />}
                </div>
              </div>
            </div>

            <div className="listing-filter-actions">
              <Button label="Clear Filters" variant="outline" size="sm" icon={RefreshIcon && <RefreshIcon size={12} />} onClick={handleClearFilters} />
              <Button label="Apply Filters" variant="primary" size="sm" icon={SearchIcon && <SearchIcon size={12} />} onClick={handleApplyFilters} />
            </div>
          </div>
        </div>

        {/* ========== MAIN 2-COLUMN SECTION ========== */}
        <div className="listing-main-grid">

          {/* ---------- LEFT COLUMN: Rejected Applications Table ---------- */}
          <div className="listing-card listing-left-col">
            <div className="listing-table-wrap">
              <table className="listing-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Application ID</th>
                    <th>Customer Name</th>
                    <th>Loan Type</th>
                    <th>Loan Amount</th>
                    <th>Rejected By</th>
                    <th>Rejected On</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => {
                    const isSelected = row.id === selectedAppId;
                    return (
                      <tr key={row.id} className={isSelected ? 'selected-row' : ''} onClick={() => setSelectedAppId(row.id)}>
                        <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="font-semibold text-primary">{row.id}</td>
                        <td>{row.customerName}</td>
                        <td>{row.loanType}</td>
                        <td className="font-semibold">{row.amount}</td>
                        <td>{row.rejectedBy}</td>
                        <td>{row.rejectedOn}</td>
                        <td>
                          <span className="badge-status-rejected">{row.reason}</span>
                        </td>
                        <td>
                          <button className="ret-action-btn">
                            {EyeIcon && <EyeIcon size={13} />}
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

          {/* ---------- RIGHT COLUMN: Rejection Details ---------- */}
          <div className="listing-card listing-right-col">
            <h3 className="listing-card-title text-danger">
              {AlertIcon && <AlertIcon size={16} className="text-danger" />}
              Rejection Details
            </h3>

            <div className="listing-df-list">
              <div className="listing-df-row">
                <span className="listing-df-label">Application ID</span>
                <span className="listing-df-val text-primary">{selectedItem.id}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Customer Name</span>
                <span className="listing-df-val">{selectedItem.customerName}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Loan Type</span>
                <span className="listing-df-val">{selectedItem.loanType}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Loan Amount</span>
                <span className="listing-df-val">{selectedItem.amount}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Rejected By</span>
                <span className="listing-df-val">{selectedItem.rejectedBy}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Rejected On</span>
                <span className="listing-df-val">{selectedItem.rejectedOn}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Primary Reason</span>
                <span className="badge-status-rejected">{selectedItem.reason}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Sub Reason</span>
                <span className="listing-df-val">{selectedItem.subReason}</span>
              </div>
              <div className="listing-df-row">
                <span className="listing-df-label">Remarks</span>
                <span className="listing-df-val">{selectedItem.remarks}</span>
              </div>
            </div>

            <div className="listing-action-stack">
              <Button
                label="View Rejection Report"
                variant="outline"
                size="sm"
                icon={EyeIcon && <EyeIcon size={13} />}
                onClick={() => navigate(ROUTES.REJECT_APPLICATION.replace(':id', selectedItem.id))}
                className="text-danger border-danger w-full"
              />
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}

export default RejectedApplications;
