import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Calendar,
  Filter,
  Eye,
  MoreVertical,
  Clock,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import Pagination from '../../components/Pagination/Pagination'
import ViewCustomerModal from '../../components/ViewCustomerModal/ViewCustomerModal'
import './SubmissionHistory.css'

const initialSubmissions = [
  {
    id: 1,
    customerName: 'Ramesh Kumar',
    initial: 'R',
    mobileNumber: '98765 43210',
    submittedOn: '05 Jun 2025, 10:45 AM',
    referenceId: 'REF2506051045',
    status: 'Pending RM Review',
    statusType: 'pending-rm',
    loanPurpose: 'Personal Loan',
    loanAmount: '₹ 1,50,000',
    remarks: 'Application submitted for fast track approval.',
  },
  {
    id: 2,
    customerName: 'Priya N',
    initial: 'P',
    mobileNumber: '98765 43211',
    submittedOn: '05 Jun 2025, 09:50 AM',
    referenceId: 'REF2506050950',
    status: 'Under Review',
    statusType: 'under-review',
    loanPurpose: 'Business Expansion',
    loanAmount: '₹ 80,000',
    remarks: 'RM reviewing financial statements.',
  },
  {
    id: 3,
    customerName: 'Kumaravel M',
    initial: 'K',
    mobileNumber: '98765 43222',
    submittedOn: '04 Jun 2025, 04:30 PM',
    referenceId: 'REF2506040430',
    status: 'Submitted',
    statusType: 'submitted',
    loanPurpose: 'Home Renovation',
    loanAmount: '₹ 2,00,000',
    remarks: 'Document verification completed.',
  },
  {
    id: 4,
    customerName: 'Suresh B',
    initial: 'S',
    mobileNumber: '98765 43233',
    submittedOn: '04 Jun 2025, 11:15 AM',
    referenceId: 'REF2506041115',
    status: 'Returned by RM',
    statusType: 'returned-rm',
    loanPurpose: 'Vehicle Loan',
    loanAmount: '₹ 1,20,000',
    remarks: 'PAN card image blurry. Please re-upload.',
  },
  {
    id: 5,
    customerName: 'Meenakshi Devi',
    initial: 'M',
    mobileNumber: '98765 43244',
    submittedOn: '03 Jun 2025, 06:20 PM',
    referenceId: 'REF2506030620',
    status: 'Approved by RM',
    statusType: 'approved-rm',
    loanPurpose: 'Medical Emergency',
    loanAmount: '₹ 90,000',
    remarks: 'Approved. Disbursal scheduled.',
  },
  {
    id: 6,
    customerName: 'Arun Prakash',
    initial: 'A',
    mobileNumber: '98765 43255',
    submittedOn: '03 Jun 2025, 02:10 PM',
    referenceId: 'REF2506030210',
    status: 'Under Review',
    statusType: 'under-review',
    loanPurpose: 'Education Loan',
    loanAmount: '₹ 1,80,000',
    remarks: 'Pending CIBIL score verification.',
  },
  {
    id: 7,
    customerName: 'Latha V',
    initial: 'L',
    mobileNumber: '98765 43266',
    submittedOn: '02 Jun 2025, 05:40 PM',
    referenceId: 'REF2506020540',
    status: 'Submitted',
    statusType: 'submitted',
    loanPurpose: 'Personal Loan',
    loanAmount: '₹ 1,10,000',
    remarks: 'Initial document check passed.',
  },
  {
    id: 8,
    customerName: 'Vijay Kumar',
    initial: 'V',
    mobileNumber: '98765 43277',
    submittedOn: '02 Jun 2025, 11:30 AM',
    referenceId: 'REF2506021130',
    status: 'Returned by RM',
    statusType: 'returned-rm',
    loanPurpose: 'Business Loan',
    loanAmount: '₹ 2,50,000',
    remarks: 'Bank passbook 6 months statement required.',
  },
]

function SubmissionHistory() {
  const navigate = useNavigate()

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedDate, setSelectedDate] = useState('')

  // View Customer Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  // Filter Logic
  const filteredSubmissions = useMemo(() => {
    return initialSubmissions.filter((item) => {
      const matchesSearch =
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mobileNumber.includes(searchTerm) ||
        item.referenceId.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        selectedStatus === 'All Status' || item.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, selectedStatus])

  const totalItems = 56

  // Paginated Slicing
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSubmissions.slice(start, start + pageSize)
  }, [filteredSubmissions, currentPage, pageSize])

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedStatus('All Status')
    setSelectedDate('')
    setCurrentPage(1)
  }

  const renderStatusBadge = (status, type) => {
    switch (type) {
      case 'pending-rm':
        return (
          <span className="status-pill status-pill--pending-rm">
            <Clock size={14} /> {status}
          </span>
        )
      case 'under-review':
        return (
          <span className="status-pill status-pill--under-review">
            <RefreshCw size={14} /> {status}
          </span>
        )
      case 'submitted':
        return (
          <span className="status-pill status-pill--submitted">
            <CheckCircle2 size={14} /> {status}
          </span>
        )
      case 'returned-rm':
        return (
          <span className="status-pill status-pill--returned-rm">
            <RotateCcw size={14} /> {status}
          </span>
        )
      case 'approved-rm':
        return (
          <span className="status-pill status-pill--approved-rm">
            <CheckCircle2 size={14} /> {status}
          </span>
        )
      default:
        return <span className="status-pill">{status}</span>
    }
  }

  return (
    <div className="submission-history">
      {/* Top Header */}
      <div className="submission-history-header">
        <div className="submission-history-title-area">
          <h1>Submission History</h1>
          <p>View all customers you have submitted to RM</p>
        </div>
        <button
          type="button"
          className="btn-add-customer-top"
          onClick={() => navigate('/Agent/add-customer')}
        >
          <Plus size={18} strokeWidth={2.2} /> Add New Customer
        </button>
      </div>

      {/* Main Table Card */}
      <div className="submission-history-card">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-search-box">
            <Search size={16} className="filter-search-icon" />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by name or mobile number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-date-box">
            <Calendar size={16} className="filter-date-icon" />
            <input
              type="text"
              className="filter-date-input"
              placeholder="Select Date Range"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onFocus={(e) => (e.target.type = 'date')}
              onBlur={(e) => {
                if (!e.target.value) e.target.type = 'text'
              }}
            />
          </div>

          <select
            className="filter-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All Status">All Status</option>
            <option value="Pending RM Review">Pending RM Review</option>
            <option value="Under Review">Under Review</option>
            <option value="Submitted">Submitted</option>
            <option value="Returned by RM">Returned by RM</option>
            <option value="Approved by RM">Approved by RM</option>
          </select>

          <button type="button" className="btn-filter-action">
            <Filter size={15} /> Filter
          </button>

          <button type="button" className="btn-reset-link" onClick={handleResetFilters}>
            Reset
          </button>
        </div>

        {/* Data Table */}
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th className="index-col">#</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Submitted On</th>
                <th>Reference ID</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={item.id}>
                  <td className="index-col">{(currentPage - 1) * pageSize + idx + 1}</td>
                  <td>
                    <div className="history-customer-cell">
                      <div className={`history-avatar avatar--${item.initial}`}>
                        {item.initial}
                      </div>
                      {item.customerName}
                    </div>
                  </td>
                  <td>{item.mobileNumber}</td>
                  <td>{item.submittedOn}</td>
                  <td>{item.referenceId}</td>
                  <td>{renderStatusBadge(item.status, item.statusType)}</td>
                  <td>
                    <div className="history-actions-cell">
                      <button
                        type="button"
                        className="btn-view-details"
                        onClick={() => setSelectedCustomer(item)}
                      >
                        <Eye size={15} strokeWidth={1.8} /> View Details
                      </button>
                      <button type="button" className="btn-more-options" aria-label="More options">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Standalone Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
          pageSizeOptions={[8, 10, 20, 50]}
        />
      </div>

      {/* View Customer Details Side Drawer */}
      {selectedCustomer && (
        <ViewCustomerModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  )
}

export default SubmissionHistory
