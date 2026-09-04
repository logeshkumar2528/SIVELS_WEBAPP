import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Eye,
  Clock,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import Pagination from '../../components/Pagination/Pagination'
import ViewCustomerModal from '../../components/ViewCustomerModal/ViewCustomerModal'
import CustomSelect from '../AddCustomer/CustomSelect'
import DatePicker from '../../components/DatePicker/DatePicker'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { formatDateTime } from '../../../../../../Core/src/utils/dateHelper'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import './SubmissionHistory.css'

const STATUS_OPTIONS = [
  { value: 'All Status', label: 'All Status' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending RM Review', label: 'Pending RM Review' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Submitted', label: 'Submitted' },
  { value: 'Returned by RM', label: 'Returned by RM' },
  { value: 'Approved by RM', label: 'Approved by RM' },
]

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
  const [pageSize, setPageSize] = useState(5)

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
        selectedStatus === 'All Status' || String(item.status ?? '') === selectedStatus

      const matchesDate =
        !selectedDate || (item.createdAt && item.createdAt.startsWith(selectedDate))

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [submissions, searchTerm, selectedStatus, selectedDate])

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
    const s = String(status ?? '').toLowerCase()
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

  const formatDate = (dateString) => formatDateTime(dateString, '-')

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
            <DatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              placeholder="Select Date Range"
            />
          </div>

          <div className="filter-status-box">
            <CustomSelect
              name="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={STATUS_OPTIONS}
              placeholder="All Status"
            />
          </div>

          <button type="button" className="btn-reset-link" onClick={handleResetFilters}>
            Reset
          </button>

          <button
            type="button"
            className="btn-add-customer-filter"
            onClick={() => navigate('/Agent/add-customer')}
          >
            <Plus size={16} strokeWidth={2.2} /> Add New Customer
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
                  <th className="index-col">S.NO</th>
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
            pageSizeOptions={[5, 10, 15, 20]}
            useCustomSelect={true}
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
