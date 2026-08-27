/**
 * NewApplicationsList.jsx
 * --------------------
 * New Applications listing — same layout as Returned/Approved/Rejected/Pending pages.
 * Uses raw <table> with listing-table classes (no DataTable component).
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout    from '../../layouts/MainLayout/MainLayout';
import Breadcrumb    from '../../components/Breadcrumb/Breadcrumb';
import Button        from '../../components/Button/Button';
import Pagination    from '../../components/Pagination/Pagination';
import iconMap       from '../../config/iconMap';
import { ROUTES }    from '../../config/routeConfig';
import {
  CURRENT_USER, BADGE_COUNTS,
  LISTING_STATS, NEW_APPLICATIONS_LIST
} from './newApplicationsListData';
import '../../styles/listingPages.css';
import './NewApplicationsList.css';

const BREADCRUMB_ITEMS = [
  { label: 'Back Office Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Applications',          path: '#' },
  { label: 'New Applications' }
];

function NewApplicationsList() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All Branches');
  const [rm, setRm] = useState('All RMs');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    branch: 'All Branches',
    rm: 'All RMs'
  });

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleOpenApp = useCallback((id) => {
    navigate(`${ROUTES.NEW_APPLICATIONS}/${id}/document-verification`);
  }, [navigate]);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ search, branch, rm });
    setCurrentPage(1);
  }, [search, branch, rm]);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setBranch('All Branches');
    setRm('All RMs');
    setAppliedFilters({ search: '', branch: 'All Branches', rm: 'All RMs' });
    setCurrentPage(1);
  }, []);

  const filteredData = useMemo(() => {
    return NEW_APPLICATIONS_LIST.filter(item => {
      if (appliedFilters.branch !== 'All Branches' && item.branch !== appliedFilters.branch) return false;
      if (appliedFilters.rm !== 'All RMs' && !item.rmName.includes(appliedFilters.rm)) return false;
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        if (
          !item.id.toLowerCase().includes(q) &&
          !item.customerName.toLowerCase().includes(q) &&
          !item.mobileNumber.includes(q)
        ) return false;
      }
      return true;
    });
  }, [appliedFilters]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [currentPage, pageSize, filteredData]);

  const EyeIcon    = iconMap['Eye'];
  const FilterIcon = iconMap['Filter'];
  const RefreshIcon = iconMap['RefreshCw'];
  const SearchIcon = iconMap['Search'];

  return (
    <MainLayout
      title="New Applications"
      user={CURRENT_USER}
      badgeCounts={BADGE_COUNTS}
      notificationCount={12}
    >
      <div className="listing-page-wrapper">
        <Breadcrumb items={BREADCRUMB_ITEMS} />

        {/* ---- TOP METRIC CARDS ---- */}
        <div className="listing-metrics-grid">
          {LISTING_STATS.map(stat => {
            const Icon = iconMap[stat.icon];
            return (
              <div key={stat.id} className="listing-metric-card">
                <div className={`listing-metric-icon ${stat.color}`}>
                  {Icon && <Icon size={16} />}
                </div>
                <div className="listing-metric-body">
                  <span className="listing-metric-title">{stat.title}</span>
                  <span className="listing-metric-value">{stat.value}</span>
                  <span className="listing-metric-subtext">{stat.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---- FILTER BAR ---- */}
        <div className="listing-filter-card">
          <div className="listing-filter-bar">
            <div className="listing-filter-group">
              <div className="listing-filter-item">
                <span className="listing-filter-label">Search By</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Application ID / Customer / Mobile No."
                    className="listing-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: '30px', width: '260px' }}
                  />
                  {SearchIcon && <SearchIcon size={14} style={{ position: 'absolute', left: '10px', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />}
                </div>
              </div>
              <div className="listing-filter-item">
                <span className="listing-filter-label">Branch</span>
                <select className="listing-select" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ width: '130px' }}>
                  <option value="All Branches">All Branches</option>
                  <option value="KK Nagar">KK Nagar</option>
                  <option value="Anna Nagar">Anna Nagar</option>
                </select>
              </div>
              <div className="listing-filter-item">
                <span className="listing-filter-label">RM</span>
                <select className="listing-select" value={rm} onChange={(e) => setRm(e.target.value)} style={{ width: '130px' }}>
                  <option value="All RMs">All RMs</option>
                  <option value="Rajesh Kumar">Rajesh Kumar</option>
                  <option value="Priya Sharma">Priya Sharma</option>
                </select>
              </div>
            </div>

            <div className="listing-filter-actions">
              <Button label="Clear Filters" variant="outline" size="sm" icon={RefreshIcon && <RefreshIcon size={12} />} onClick={handleClearFilters} />
              <Button label="Apply Filters" variant="primary" size="sm" icon={FilterIcon && <FilterIcon size={12} />} onClick={handleApplyFilters} />
            </div>
          </div>
        </div>

        {/* ---- TABLE CARD (full width) ---- */}
        <div className="listing-card listing-left-col" style={{ flex: 1, minHeight: 0 }}>
          <div className="listing-table-wrap">
            <table className="listing-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Application ID</th>
                  <th>Customer Name</th>
                  <th>Loan Type</th>
                  <th>Requested Amount</th>
                  <th>Submitted By (Agent)</th>
                  <th>Submitted Date & Time</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="font-semibold text-primary">{row.id}</td>
                    <td>
                      <div className="list-cell-stack">
                        <span className="list-cell-primary">{row.customerName}</span>
                        <span className="list-cell-secondary">{row.mobileNumber}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`loantype-badge loantype-${row.loanType.includes('Business') ? 'business' : row.loanType.includes('Housing') ? 'housing' : row.loanType.includes('Property') ? 'property' : 'personal'}`}>
                        {row.loanType}
                      </span>
                    </td>
                    <td className="font-semibold">{row.requestedAmount}</td>
                    <td>
                      <div className="list-cell-stack">
                        <span className="list-cell-primary">{row.agentName}</span>
                        <span className="list-cell-secondary">RM: {row.rmName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="list-cell-stack">
                        <span className="list-cell-primary">{row.submittedDate}</span>
                        <span className="list-cell-secondary">{row.submittedTime}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-priority-${row.priority.toLowerCase()}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td>
                      <span className="badge-status-approved">{row.status}</span>
                    </td>
                    <td>
                      <Button
                        label="Open Application"
                        variant="outline"
                        size="sm"
                        icon={EyeIcon && <EyeIcon size={13} />}
                        onClick={() => handleOpenApp(row.id)}
                      />
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
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </MainLayout>
  );
}

export default NewApplicationsList;
