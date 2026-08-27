import { useState, useMemo } from 'react';
import iconMap from '../../config/iconMap';
import StatCard from '../../components/StatCard/StatCard';
import DataTable from '../../components/DataTable/DataTable';
import Pagination from '../../components/Pagination/Pagination';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Modal from '../../components/Modal/Modal';
import { statsData, INITIAL_CUSTOMERS } from './customerAllocationsData';
import '../../styles/listingPages.css';
import './CustomerAllocations.css';

export default function CustomerAllocations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loanTypeFilter, setLoanTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const SearchIcon = iconMap['Search'];
  const DownloadIcon = iconMap['Download'];
  const EyeIcon = iconMap['Eye'];
  const UserIcon = iconMap['User'];
  const CalendarIcon = iconMap['Calendar'];
  const LandmarkIcon = iconMap['Landmark'];
  const IndianRupee = iconMap['IndianRupee'];

  const filteredCustomers = useMemo(() => {
    return INITIAL_CUSTOMERS.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType =
        loanTypeFilter === 'All' || item.type === loanTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchTerm, loanTypeFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const columns = [
    {
      key: 'index',
      label: '#',
      render: (_, idx) => (currentPage - 1) * pageSize + idx + 1,
    },
    {
      key: 'name',
      label: 'Customer Name',
      render: (row) => (
        <div>
          <div className="customer-name">{row.name}</div>
          <div className="customer-id">{row.id}</div>
        </div>
      ),
    },
    { key: 'type', label: 'Loan Type' },
    {
      key: 'allocation',
      label: 'My Allocation',
      render: (row) => (
        <div>
          <span className="alloc-val">{row.allocation}</span>{' '}
          <span className="alloc-pct">{row.allocPct}</span>
        </div>
      ),
    },
    { key: 'rate', label: 'Interest Rate (p.a.)' },
    { key: 'date', label: 'Disbursed On' },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'action',
      label: 'Action',
      align: 'center',
      render: (row) => (
        <button
          type="button"
          className="btn-action-view"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCustomer(row);
          }}
          title="View Allocation Details"
        >
          {EyeIcon && <EyeIcon size={16} />} View
        </button>
      ),
    },
  ];

  return (
    <div className="listing-page-wrapper">
      {/* 6 Stats Row */}
      <div className="listing-metrics-grid">
        {statsData.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className="listing-filter-card">
        <div className="listing-filter-bar">
          <div className="listing-filter-group">
            <div className="listing-filter-item">
              <label className="listing-filter-label">Loan Type</label>
              <select
                className="listing-select"
                value={loanTypeFilter}
                onChange={(e) => {
                  setLoanTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All Loan Types</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Housing Loan">Housing Loan</option>
                <option value="Property Loan">Property Loan</option>
              </select>
            </div>

            <div className="listing-filter-item">
              <label className="listing-filter-label">Search Customer</label>
              <div className="listing-search-box">
                <input
                  type="text"
                  placeholder="Search by Name or Loan ID"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {SearchIcon && <SearchIcon size={16} color="var(--color-text-muted)" />}
              </div>
            </div>
          </div>

          <div className="listing-filter-actions">
            <button type="button" className="btn-export">
              {DownloadIcon && <DownloadIcon size={16} />} Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card with Pagination */}
      <div className="listing-table-card">
        <h3 className="dashboard-card-title">Customer Allocation Details</h3>

        <DataTable columns={columns} data={paginatedData} />

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Redesigned Rich Modal UI */}
      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Allocation Details"
      >
        {selectedCustomer && (
          <div className="customer-modal-container">
            {/* Customer Profile Header Banner */}
            <div className="modal-profile-header">
              <div className="modal-avatar-circle">
                {selectedCustomer.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()}
              </div>

              <div className="modal-profile-info">
                <div className="modal-customer-name">{selectedCustomer.name}</div>
                <div className="modal-app-id">
                  ID: {selectedCustomer.id} •{' '}
                  <span className="modal-loan-type-tag">{selectedCustomer.type}</span>
                </div>
              </div>

              <div className="modal-status-wrap">
                <StatusBadge status={selectedCustomer.status} />
              </div>
            </div>

            {/* 4 Metric Highlight Cards */}
            <div className="modal-metrics-grid">
              <div className="modal-metric-card metric-card--primary">
                <span className="modal-metric-label">My Allocation</span>
                <span className="modal-metric-value val-green">
                  {selectedCustomer.allocation}
                </span>
                <span className="modal-metric-sub">{selectedCustomer.allocPct} of loan</span>
              </div>

              <div className="modal-metric-card">
                <span className="modal-metric-label">Sanctioned Amount</span>
                <span className="modal-metric-value">{selectedCustomer.amount}</span>
                <span className="modal-metric-sub">Total Loan Value</span>
              </div>

              <div className="modal-metric-card">
                <span className="modal-metric-label">Interest Rate</span>
                <span className="modal-metric-value val-blue">
                  {selectedCustomer.rate}
                </span>
                <span className="modal-metric-sub">Annual ROI (p.a.)</span>
              </div>

              <div className="modal-metric-card">
                <span className="modal-metric-label">Monthly EMI</span>
                <span className="modal-metric-value val-orange">
                  {selectedCustomer.emi}
                </span>
                <span className="modal-metric-sub">Regular Repayment</span>
              </div>
            </div>

            {/* Allocation Share Bar */}
            <div className="modal-allocation-share-card">
              <div className="share-header">
                <span className="share-label">Your Allocation Share</span>
                <span className="share-pct-val">{selectedCustomer.allocPct}</span>
              </div>
              <div className="share-bar-bg">
                <div
                  className="share-bar-fill"
                  style={{
                    width: selectedCustomer.allocPct.replace(/[^0-9.]/g, '') + '%',
                  }}
                />
              </div>
            </div>

            {/* Information Grid */}
            <div className="modal-info-panel">
              <div className="info-panel-row">
                <span className="info-panel-label">Disbursement Date</span>
                <span className="info-panel-val">{selectedCustomer.date}</span>
              </div>
              <div className="info-panel-row">
                <span className="info-panel-label">Repayment Status</span>
                <span className="info-panel-val val-green">Up to Date</span>
              </div>
              <div className="info-panel-row">
                <span className="info-panel-label">Loan Security</span>
                <span className="info-panel-val">Verified & Documented</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-footer-actions">
              <button
                type="button"
                className="modal-btn-close"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="modal-btn-download"
                onClick={() => {
                  alert(`Downloading allocation summary for ${selectedCustomer.name}`);
                }}
              >
                {DownloadIcon && <DownloadIcon size={16} />} Download Summary
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
