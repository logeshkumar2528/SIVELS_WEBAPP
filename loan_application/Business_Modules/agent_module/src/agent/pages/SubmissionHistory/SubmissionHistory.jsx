import { useState, useMemo, useEffect } from 'react'
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
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import './SubmissionHistory.css'

function SubmissionHistory() {
  const navigate = useNavigate()
  
  // Asynchronously resolve the true agentId based on logged-in user
  const { agentId, loadingAgent } = useAgentIdentity()

  // API States
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedDate, setSelectedDate] = useState('')

  // View Customer Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)

  const fetchSubmissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await agentCustomerService.getAllCustomers()
      
      const extractArray = (res) => {
        if (Array.isArray(res)) return res
        if (res && typeof res === 'object') {
           if (Array.isArray(res.data)) return res.data
           if (Array.isArray(res.items)) return res.items
           if (Array.isArray(res.result)) return res.result
           if (Array.isArray(res.list)) return res.list
        }
        return []
      }

      const allCustomers = extractArray(data)
      
      // Filter by current AgentId
      const myCustomers = allCustomers.filter(c => Number(c.agentId) === Number(agentId))
      
      // Sort DESC by CreatedAt
      myCustomers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      
      setSubmissions(myCustomers)
    } catch (err) {
      console.error("Failed to load submissions", err)
      setError("Unable to load submission history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!loadingAgent && agentId) {
      fetchSubmissions()
    }
  }, [agentId, loadingAgent])

  // Filter Logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchesSearch =
        (item.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.mobileNumber || '').includes(searchTerm)

      const matchesStatus =
        selectedStatus === 'All Status' || item.status === selectedStatus

      return matchesSearch && matchesStatus
    })
  }, [submissions, searchTerm, selectedStatus])

  const totalItems = filteredSubmissions.length

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

  const getStatusType = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('pending')) return 'pending-rm'
    if (s.includes('review')) return 'under-review'
    if (s.includes('return') || s.includes('reject')) return 'returned-rm'
    if (s.includes('approve') || s.includes('success')) return 'approved-rm'
    if (s.includes('submit')) return 'submitted'
    if (s.includes('draft')) return 'pending-rm'
    return 'default'
  }

  const renderStatusBadge = (status) => {
    const type = getStatusType(status)
    const displayStatus = status || 'Unknown'
    
    switch (type) {
      case 'pending-rm':
        return (
          <span className="status-pill status-pill--pending-rm">
            <Clock size={14} /> {displayStatus}
          </span>
        )
      case 'under-review':
        return (
          <span className="status-pill status-pill--under-review">
            <RefreshCw size={14} /> {displayStatus}
          </span>
        )
      case 'submitted':
        return (
          <span className="status-pill status-pill--submitted">
            <CheckCircle2 size={14} /> {displayStatus}
          </span>
        )
      case 'returned-rm':
        return (
          <span className="status-pill status-pill--returned-rm">
            <RotateCcw size={14} /> {displayStatus}
          </span>
        )
      case 'approved-rm':
        return (
          <span className="status-pill status-pill--approved-rm">
            <CheckCircle2 size={14} /> {displayStatus}
          </span>
        )
      default:
        return <span className="status-pill">{displayStatus}</span>
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    })
  }

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount)
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
            <option value="Draft">Draft</option>
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

        {/* Data Table Area */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading submission history...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
            <p>{error}</p>
            <button onClick={fetchSubmissions} className="std-btn std-btn-primary" style={{ marginTop: '10px' }}>Retry</button>
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <p>You haven't submitted any customer applications yet.</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <p>No submissions match your current filters.</p>
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th className="index-col">#</th>
                  <th>Customer Name</th>
                  <th>Mobile Number</th>
                  <th>Expected Loan Amount</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  const initial = (item.fullName || 'U').charAt(0).toUpperCase()
                  return (
                    <tr key={item.agentCustomerId || item.id}>
                      <td className="index-col">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <div className="history-customer-cell">
                          <div className={`history-avatar avatar--${initial.match(/[A-M]/) ? 'P' : 'R'}`}>
                            {initial}
                          </div>
                          {item.fullName}
                        </div>
                      </td>
                      <td>{item.mobileNumber}</td>
                      <td>{formatCurrency(item.expectedLoanAmount)}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{renderStatusBadge(item.status)}</td>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Standalone Pagination Component */}
        {!loading && !error && filteredSubmissions.length > 0 && (
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
        )}
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
