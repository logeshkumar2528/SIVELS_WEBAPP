/**
 * PendingApplications.jsx
 * --------------------
 * Pending Applications Queue page.
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
  CURRENT_USER, BADGE_COUNTS, STEPPER_CARDS, QUEUE_SUMMARY, PENDING_TABLE_DATA
} from './pendingApplicationsData';
import '../../styles/listingPages.css';
import './PendingApplications.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Pending Applications' }
];

function PendingApplications() {
  const [activeTab, setActiveTab] = useState('new');
  const [branch, setBranch] = useState('All Branches');
  const [loanType, setLoanType] = useState('All Loan Types');
  const [assignedTo, setAssignedTo] = useState('All Users');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [appliedFilters, setAppliedFilters] = useState({
    branch: 'All Branches',
    loanType: 'All Loan Types',
    assignedTo: 'All Users',
    search: ''
  });

  const navigate = useNavigate();

  const handleApplyFilters = () => {
    setAppliedFilters({ branch, loanType, assignedTo, search });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setBranch('All Branches');
    setLoanType('All Loan Types');
    setAssignedTo('All Users');
    setSearch('');
    setAppliedFilters({ branch: 'All Branches', loanType: 'All Loan Types', assignedTo: 'All Users', search: '' });
    setCurrentPage(1);
  };

  const filteredData = PENDING_TABLE_DATA.filter(item => {
    if (appliedFilters.branch !== 'All Branches' && item.branch !== appliedFilters.branch) return false;
    if (appliedFilters.loanType !== 'All Loan Types' && item.loanType !== appliedFilters.loanType) return false;
    if (appliedFilters.assignedTo !== 'All Users' && !item.assignedTo.includes(appliedFilters.assignedTo)) return false;
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      if (!item.id.toLowerCase().includes(q) && !item.customerName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const EyeIcon        = iconMap['Eye'];
  const SearchIcon     = iconMap['Search'];
  const RefreshIcon    = iconMap['RefreshCw'];
  const InfoIcon       = iconMap['Info'];
  const UsersIcon      = iconMap['Users'];
  const DownloadIcon   = iconMap['Download'];

  return (
    <MainLayout
      title="Pending Applications Queue"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <div className="listing-page-wrapper">
        <Breadcrumb items={BREADCRUMB_ITEMS} />

        {/* ========== TOP METRIC CARDS ========== */}
        <div className="listing-metrics-grid">
          {STEPPER_CARDS.map((card) => {
            const IconComp = iconMap[card.icon];
            return (
              <div key={card.id} className="listing-metric-card">
                <div className={`listing-metric-icon ${card.color}`}>
                  {IconComp && <IconComp size={16} />}
                </div>
                <div className="listing-metric-body">
                  <span className="listing-metric-title">{card.title}</span>
                  <span className="listing-metric-value">{card.count}</span>
                  <span className="listing-metric-subtext">{card.subtext}</span>
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
                <span className="listing-filter-label">Branch</span>
                <select className="listing-select" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ width: '130px' }}>
                  <option value="All Branches">All Branches</option>
                  <option value="KK Nagar">KK Nagar</option>
                </select>
              </div>
              <div className="listing-filter-item">
                <span className="listing-filter-label">Loan Type</span>
                <select className="listing-select" value={loanType} onChange={(e) => setLoanType(e.target.value)} style={{ width: '130px' }}>
                  <option value="All Loan Types">All Loan Types</option>
                </select>
              </div>
              <div className="listing-filter-item">
                <span className="listing-filter-label">Assigned To</span>
                <select className="listing-select" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ width: '130px' }}>
                  <option value="All Users">All Users</option>
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

          {/* ---------- LEFT COLUMN: Tabbed Table ---------- */}
          <div className="listing-card listing-left-col">
            <div className="pa-tabs">
              <button className={`pa-tab-btn ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>New</button>
              <button className={`pa-tab-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending Review</button>
              <button className={`pa-tab-btn ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>Under Verification</button>
              <button className={`pa-tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>Completed</button>
            </div>

            <div className="listing-table-wrap">
              <table className="listing-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Application ID</th>
                    <th>Customer Name</th>
                    <th>Loan Type</th>
                    <th>Loan Amount</th>
                    <th>Assigned To</th>
                    <th>Assigned On</th>
                    <th>Priority</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={row.id}>
                      <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td className="font-semibold text-primary">{row.id}</td>
                      <td>{row.customerName}</td>
                      <td>{row.loanType}</td>
                      <td className="font-semibold">{row.amount}</td>
                      <td>{row.assignedTo}</td>
                      <td>{row.assignedOn}</td>
                      <td>
                        <span className={`badge-priority-${row.priority.toLowerCase()}`}>
                          {row.priority}
                        </span>
                      </td>
                      <td>
                        <button className="ret-action-btn" onClick={() => navigate(ROUTES.DOCUMENT_VERIFICATION.replace(':id', row.id))}>
                          {EyeIcon && <EyeIcon size={13} />}
                        </button>
                      </td>
                    </tr>
                  ))}
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

          {/* ---------- RIGHT COLUMN: Summary & Actions ---------- */}
          <div className="listing-card listing-right-col">
            
            <h3 className="listing-card-title text-success">Queue Summary</h3>
            <div className="listing-df-list">
              <div className="listing-df-row"><span className="listing-df-label">New</span><span className="listing-df-val">{QUEUE_SUMMARY.newCount}</span></div>
              <div className="listing-df-row"><span className="listing-df-label">Pending Review</span><span className="listing-df-val">{QUEUE_SUMMARY.pendingReview}</span></div>
              <div className="listing-df-row"><span className="listing-df-label">Under Verification</span><span className="listing-df-val">{QUEUE_SUMMARY.underVerification}</span></div>
              <div className="listing-df-row"><span className="listing-df-label">Completed (This Month)</span><span className="listing-df-val">{QUEUE_SUMMARY.completedMonth}</span></div>
              <div className="listing-df-row" style={{ borderTop: '2px solid var(--color-border)', marginTop: '4px', paddingTop: '6px' }}>
                <span className="text-primary font-bold">Total Applications</span>
                <span className="font-bold text-primary">{QUEUE_SUMMARY.total}</span>
              </div>
            </div>

            <div className="listing-action-stack">
              <Button
                label="Bulk Assign"
                variant="outline"
                size="sm"
                icon={UsersIcon && <UsersIcon size={13} className="text-primary" />}
                onClick={() => {}}
                className="w-full"
              />
              <Button
                label="Export Queue List"
                variant="outline"
                size="sm"
                icon={DownloadIcon && <DownloadIcon size={13} className="text-success" />}
                onClick={() => {}}
                className="w-full"
              />
            </div>

            <div className="pa-tip-card" style={{ marginTop: '4px', padding: '6px 8px', fontSize: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', marginBottom: '2px' }}>
                {InfoIcon && <InfoIcon size={12} />} Tip
              </div>
              Assign applications to the officer for faster processing.
            </div>

          </div>

        </div>
      </div>
    </MainLayout>
  );
}

export default PendingApplications;
