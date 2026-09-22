import { useState, useMemo, useEffect, useRef } from 'react'
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
import { masterService } from '../../../../../../Core/src/services/masterService'
import { resolveDocumentTypeId } from '../../../../../../Core/src/utils/documentTypeHelper'
import { formatDateTime } from '../../../../../../Core/src/utils/dateHelper'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import { isCustomerOwnedByAgent } from '../../utils/agentOwnershipHelper'
import { normalizeApplicationStatus } from '../../../../../rm_modules/src/utils/rmContext'
import './SubmissionHistory.css'

const STATUS_OPTIONS = [
  { value: 'All Status', label: 'All Status' },
  { value: 'New', label: 'New' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Returned', label: 'Returned' },
  { value: 'Logged to HO', label: 'Logged to HO' },
]

function SubmissionHistory() {
  const navigate = useNavigate()
  
  // Asynchronously resolve the true agentId based on logged-in user
  const { agentId, loadingAgent } = useAgentIdentity()

  // API States
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Photo Resolution and Caching States
  const [photoDocTypeId, setPhotoDocTypeId] = useState(null)
  const [customerPhotos, setCustomerPhotos] = useState({})
  const photoUrlsRef = useRef({})

  // Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('All Status')
  const [selectedDate, setSelectedDate] = useState({ startDate: '', endDate: '' })

  // View Customer Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)

  // Fetch DocumentTypeMaster once on mount to dynamically resolve Photo document type ID
  useEffect(() => {
    let isMounted = true
    const loadDocTypes = async () => {
      try {
        const data = await masterService.getDocumentTypes()
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
        const docTypeList = extractArray(data)
        const resolvedId = resolveDocumentTypeId(docTypeList, 'photo')
        if (isMounted && resolvedId) {
          setPhotoDocTypeId(resolvedId)
        }
      } catch (err) {
        console.error('Failed to resolve photo document type', err)
      }
    }
    loadDocTypes()
    return () => {
      isMounted = false
    }
  }, [])

  // Auto-reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedStatus, selectedDate])

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
      
      // Filter by current AgentId using shared ownership resolution
      const myCustomers = allCustomers.filter(c => isCustomerOwnedByAgent(c, agentId))
      
      // Sort DESC by CreatedAt
      myCustomers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      
      setSubmissions(myCustomers.map((customer) => ({
        ...customer,
        status: normalizeApplicationStatus(
          customer.status ?? customer.Status,
          customer.statusName ?? customer.StatusName
        ),
      })))
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

      let matchesDate = true
      if (selectedDate && (selectedDate.startDate || selectedDate.endDate)) {
        const { startDate, endDate } = selectedDate
        if (item.createdAt) {
          let itemDateStr = ''
          if (typeof item.createdAt === 'string') {
            itemDateStr = item.createdAt.split('T')[0].substring(0, 10)
          } else if (item.createdAt instanceof Date) {
            itemDateStr = item.createdAt.toISOString().split('T')[0]
          }

          if (startDate && endDate) {
            matchesDate = Boolean(itemDateStr) && itemDateStr >= startDate && itemDateStr <= endDate
          } else if (startDate) {
            matchesDate = Boolean(itemDateStr) && itemDateStr >= startDate
          } else if (endDate) {
            matchesDate = Boolean(itemDateStr) && itemDateStr <= endDate
          }
        } else {
          matchesDate = false
        }
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [submissions, searchTerm, selectedStatus, selectedDate])

  const totalItems = filteredSubmissions.length

  // Paginated Slicing
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSubmissions.slice(start, start + pageSize)
  }, [filteredSubmissions, currentPage, pageSize])

  // Load Photos for current visible page (paginatedData)
  useEffect(() => {
    if (!photoDocTypeId || !paginatedData || paginatedData.length === 0) return

    let isMounted = true

    // Identify customers on the current visible page that haven't been checked/cached yet
    const uncheckedCustomers = paginatedData.filter((item) => {
      const custId = item.agentCustomerId || item.AgentCustomerId || item.id
      return custId && customerPhotos[custId] === undefined
    })

    if (uncheckedCustomers.length === 0) return

    const fetchPhotos = async () => {
      for (const item of uncheckedCustomers) {
        if (!isMounted) break
        const custId = item.agentCustomerId || item.AgentCustomerId || item.id
        if (!custId) continue

        try {
          const docsRes = await agentCustomerService.getDocumentsByCustomerId(custId)
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
          const docList = extractArray(docsRes)

          // Find photo document matching resolved photoDocTypeId or documentTypeName containing 'photo'
          const photoDoc = docList.find((doc) => {
            if (!doc || doc.isActive === false || doc.IsActive === false) return false
            const dtId = Number(doc.documentTypeId ?? doc.DocumentTypeId)
            if (Number.isFinite(dtId) && dtId === Number(photoDocTypeId)) return true
            const name = String(doc.documentTypeName || doc.documentName || doc.name || '').toLowerCase()
            return name === 'photo' || name === 'profile photo' || name === 'profile image' || name === 'applicant photo'
          })

          if (photoDoc) {
            const docId = photoDoc.agentCustomerDocumentId ?? photoDoc.AgentCustomerDocumentId ?? photoDoc.id
            if (docId) {
              const blob = await agentCustomerService.downloadDocument(docId)
              if (blob && blob.size > 0) {
                let mimeType = blob.type || 'image/jpeg'
                const fileName = photoDoc.fileName || photoDoc.documentName || ''
                if (/\.png$/i.test(fileName)) mimeType = 'image/png'
                else if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg'
                else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp'
                
                const typedBlob = blob.type ? blob : new Blob([blob], { type: mimeType })
                const url = URL.createObjectURL(typedBlob)

                if (isMounted) {
                  photoUrlsRef.current[custId] = url
                  setCustomerPhotos((prev) => ({ ...prev, [custId]: url }))
                } else {
                  URL.revokeObjectURL(url)
                }
                continue
              }
            }
          }

          if (isMounted) {
            setCustomerPhotos((prev) => ({ ...prev, [custId]: null }))
          }
        } catch (err) {
          if (isMounted) {
            setCustomerPhotos((prev) => ({ ...prev, [custId]: null }))
          }
        }
      }
    }

    fetchPhotos()

    return () => {
      isMounted = false
    }
  }, [paginatedData, photoDocTypeId, customerPhotos])

  // Cleanup all created Object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(photoUrlsRef.current).forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [])

  const handleImageError = (custId) => {
    const url = photoUrlsRef.current[custId]
    if (url) {
      URL.revokeObjectURL(url)
      delete photoUrlsRef.current[custId]
    }
    setCustomerPhotos((prev) => ({ ...prev, [custId]: null }))
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedStatus('All Status')
    setSelectedDate({ startDate: '', endDate: '' })
    setCurrentPage(1)
  }

  const getStatusType = (status) => {
    const s = String(status ?? '').toLowerCase()
    if (s.includes('pending')) return 'pending-rm'
    if (s.includes('review')) return 'under-review'
    if (s.includes('return') || s.includes('reject')) return 'returned-rm'
    if (s.includes('approve') || s.includes('success') || s.includes('logged to ho')) return 'approved-rm'
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
                  const custId = item.agentCustomerId || item.AgentCustomerId || item.id
                  const initial = (item.fullName || 'U').charAt(0).toUpperCase()
                  const photoUrl = customerPhotos[custId]

                  return (
                    <tr key={custId}>
                      <td className="index-col">{(currentPage - 1) * pageSize + idx + 1}</td>
                      <td>
                        <div className="history-customer-cell">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={item.fullName || 'Customer'}
                              className="history-avatar history-avatar-img"
                              onError={() => handleImageError(custId)}
                            />
                          ) : (
                            <div className={`history-avatar avatar--${initial.match(/[A-M]/) ? 'P' : 'R'}`}>
                              {initial}
                            </div>
                          )}
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
            pageSizeOptions={[5, 7, 10]}
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
