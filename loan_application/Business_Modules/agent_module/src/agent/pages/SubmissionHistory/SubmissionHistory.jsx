import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Clock,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
  Calendar,
} from 'lucide-react'
import Pagination from '../../components/Pagination/Pagination'
import ViewCustomerModal from '../../components/ViewCustomerModal/ViewCustomerModal'
import CustomSelect from '../AddCustomer/CustomSelect'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { masterService } from '../../../../../../Core/src/services/masterService'
import {
  resolveDocumentTypeId,
  selectLatestCustomerPhotoDoc,
  selectLatestUpdatedCustomerPhotoRejection,
} from '../../../../../../Core/src/utils/documentTypeHelper'
import { formatDateTime, matchesListingDateCriteria } from '../../../../../../Core/src/utils/dateHelper'
import { getApiErrorMessage } from '../../../../../../Core/src/utils/apiErrorHandler'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import { isCustomerOwnedByAgent } from '../../utils/agentOwnershipHelper'
import { normalizeApplicationStatus } from '../../../../../rm_modules/src/utils/rmContext'
import './SubmissionHistory.css'

const STATUS_OPTIONS = [
  { value: 'All Status', label: 'All Status' },
  { value: 'New', label: 'New' },
  { value: 'Pending', label: 'RM Pending' },
  { value: 'Under Review', label: 'CM Pending' },
  { value: 'Returned', label: 'BO Returned' },
  { value: 'Logged to HO', label: 'Logged to HO' },
]

const getStatusType = (status) => {
  const s = String(status ?? '').toLowerCase()
  if (s.includes('pending')) return 'pending-rm'
  if (s.includes('review')) return 'under-review'
  if (s.includes('return') || s.includes('reject')) return 'returned-rm'
  if (s.includes('approve') || s.includes('success') || s.includes('logged to ho')) return 'approved-rm'
  if (s.includes('submit')) return 'submitted'
  if (s.includes('draft') || s.includes('new')) return 'new-rm'
  return 'default'
}

function SubmissionHistory() {
  const navigate = useNavigate()
  
  // Asynchronously resolve the true agentId based on logged-in user
  const { agentId, loadingAgent } = useAgentIdentity()

  // API States
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Photo Resolution, Rejections, and Caching States
  const [photoDocTypeId, setPhotoDocTypeId] = useState(null)
  const [documentRejections, setDocumentRejections] = useState([])
  const [customerPhotos, setCustomerPhotos] = useState({})
  const photoUrlsRef = useRef({})

  // Filter States (Draft vs Applied)
  const [draftSearch, setDraftSearch] = useState('')
  const [draftStatus, setDraftStatus] = useState('All Status')
  const [draftFromDate, setDraftFromDate] = useState('')
  const [draftToDate, setDraftToDate] = useState('')
  const [dateRangeError, setDateRangeError] = useState('')

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: 'All Status',
    fromDate: '',
    toDate: '',
  })

  // View Customer Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Delete Customer Modal State
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(7)

  // Fetch DocumentTypeMaster and DocumentRejections once on mount
  useEffect(() => {
    let isMounted = true
    const loadInitialData = async () => {
      try {
        const [docTypeData, rejectionsData] = await Promise.all([
          masterService.getDocumentTypes().catch(() => []),
          agentCustomerService.getDocumentRejections().catch(() => []),
        ])

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

        const docTypeList = extractArray(docTypeData)
        const rejList = extractArray(rejectionsData)

        const resolvedId = resolveDocumentTypeId(docTypeList, 'photo')
        if (isMounted) {
          if (resolvedId) {
            setPhotoDocTypeId(resolvedId)
          }
          setDocumentRejections(rejList)
        }
      } catch (err) {
        console.error('Failed to resolve initial master/rejection data', err)
      }
    }
    loadInitialData()
    return () => {
      isMounted = false
    }
  }, [])

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

  // Filter Logic based strictly on appliedFilters
  const filteredSubmissions = useMemo(() => {
    const searchTrimmed = (appliedFilters.search || '').trim().toLowerCase()
    const searchActive = searchTrimmed.length > 0
    const fromDate = appliedFilters.fromDate || ''
    const toDate = appliedFilters.toDate || ''

    return submissions.filter((item) => {
      const matchesDate = matchesListingDateCriteria({
        dateValue: item.createdAt,
        searchActive,
        fromDate,
        toDate,
      })
      if (!matchesDate) return false

      if (searchActive) {
        const matchesSearch =
          (item.fullName || '').toLowerCase().includes(searchTrimmed) ||
          (item.mobileNumber || '').includes(searchTrimmed)
        if (!matchesSearch) return false
      }

      const matchesStatus =
        appliedFilters.status === 'All Status' ||
        getStatusType(item.status) === getStatusType(appliedFilters.status)

      return matchesStatus
    })
  }, [submissions, appliedFilters])

  const totalItems = filteredSubmissions.length

  // Paginated Slicing
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSubmissions.slice(start, start + pageSize)
  }, [filteredSubmissions, currentPage, pageSize])

  // Load Photos for current visible page (paginatedData) with priority:
  // 1. Latest Updated Photo from BackOfficeDocumentRejection
  // 2. Original Photo from AgentCustomerDocument
  // 3. Initial letter avatar (null)
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
        const appProdId = item.applicationProductDetailsId || item.ApplicationProductDetailsId || null
        if (!custId) continue

        let loadedPhotoUrl = null

        try {
          // STEP 1: Check for Latest Updated / Resubmitted Photo from BackOfficeDocumentRejection
          const updatedRejDoc = selectLatestUpdatedCustomerPhotoRejection(
            documentRejections,
            custId,
            appProdId
          )

          if (updatedRejDoc) {
            const path = String(
              updatedRejDoc.currentDocumentPath ?? updatedRejDoc.CurrentDocumentPath ?? ''
            ).trim().replace(/\\/g, '/').replace(/^\/+/, '')

            let rejBlob = null
            if (path.startsWith('UploadedFiles/KYCDocuments/') || path.startsWith('KYCDocuments/')) {
              rejBlob = await agentCustomerService.downloadKycDocument(path)
            } else if (path.startsWith('UploadedFiles/AgentCustomers/') || path.startsWith('AgentCustomers/')) {
              const agentDocId = updatedRejDoc.agentCustomerDocumentId ?? updatedRejDoc.AgentCustomerDocumentId ?? null
              if (agentDocId) {
                rejBlob = await agentCustomerService.downloadDocument(agentDocId)
              }
            }

            if (rejBlob && rejBlob.size > 0) {
              let mimeType = rejBlob.type || 'image/jpeg'
              const fileName = path.split('/').pop() || ''
              if (/\.png$/i.test(fileName)) mimeType = 'image/png'
              else if (/\.(jpg|jpeg)$/i.test(fileName)) mimeType = 'image/jpeg'
              else if (/\.webp$/i.test(fileName)) mimeType = 'image/webp'

              const typedBlob = rejBlob.type ? rejBlob : new Blob([rejBlob], { type: mimeType })
              loadedPhotoUrl = URL.createObjectURL(typedBlob)
            }
          }

          // STEP 2: Fallback to Original Photo from AgentCustomerDocument if no updated photo
          if (!loadedPhotoUrl) {
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

            const photoDoc = selectLatestCustomerPhotoDoc(docList, photoDocTypeId)
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
                  loadedPhotoUrl = URL.createObjectURL(typedBlob)
                }
              }
            }
          }

          // STEP 3: Store loaded URL in cache, or null for initial avatar
          if (isMounted) {
            if (loadedPhotoUrl) {
              photoUrlsRef.current[custId] = loadedPhotoUrl
              setCustomerPhotos((prev) => ({ ...prev, [custId]: loadedPhotoUrl }))
            } else {
              setCustomerPhotos((prev) => ({ ...prev, [custId]: null }))
            }
          } else if (loadedPhotoUrl) {
            URL.revokeObjectURL(loadedPhotoUrl)
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
  }, [paginatedData, photoDocTypeId, documentRejections, customerPhotos])

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

  const handleEditCustomer = (customer) => {
    const custId = customer.agentCustomerId || customer.AgentCustomerId || customer.id
    if (!custId) return
    navigate(`/Agent/add-customer?id=${custId}&mode=edit`, {
      state: { customerId: custId, mode: 'edit' }
    })
  }

  const handleOpenDeleteModal = (customer) => {
    setCustomerToDelete(customer)
    setDeleteError(null)
  }

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setCustomerToDelete(null)
      setDeleteError(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return
    const custId = customerToDelete.agentCustomerId || customerToDelete.AgentCustomerId || customerToDelete.id
    if (!custId) return

    setIsDeleting(true)
    setDeleteError(null)
    try {
      await agentCustomerService.deleteCustomer(custId, Number(agentId))
      setCustomerToDelete(null)
      await fetchSubmissions()
    } catch (err) {
      console.error('Failed to delete customer', err)
      const errInfo = getApiErrorMessage(err)
      const errMsg =
        errInfo?.global ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete customer. Please try again.'
      setDeleteError(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSearch = () => {
    if (draftFromDate && draftToDate && draftFromDate > draftToDate) {
      setDateRangeError('From Date cannot be after To Date.')
      return
    }
    setDateRangeError('')
    setAppliedFilters({
      search: draftSearch,
      status: draftStatus,
      fromDate: draftFromDate,
      toDate: draftToDate,
    })
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setDraftSearch('')
    setDraftStatus('All Status')
    setDraftFromDate('')
    setDraftToDate('')
    setDateRangeError('')
    setAppliedFilters({
      search: '',
      status: 'All Status',
      fromDate: '',
      toDate: '',
    })
    setCurrentPage(1)
  }

  const renderStatusBadge = (status) => {
    const type = getStatusType(status)
    let displayStatus = status || 'Unknown'
    if (status === 'Pending') displayStatus = 'RM Pending'
    else if (status === 'Under Review') displayStatus = 'CM Pending'
    else if (status === 'Returned') displayStatus = 'BO Returned'
    
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
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
          </div>

          <label htmlFor="submission-from-date" className="filter-unified-date-box">
            <Calendar size={14} strokeWidth={1.8} className="filter-date-icon" />
            <span className="filter-date-prefix">From Date:</span>
            <input
              id="submission-from-date"
              type="date"
              className="filter-date-input"
              value={draftFromDate}
              max={draftToDate || undefined}
              onChange={(e) => {
                setDraftFromDate(e.target.value)
                if (dateRangeError) setDateRangeError('')
              }}
              aria-label="From Date"
              title="From Date"
            />
          </label>

          <label htmlFor="submission-to-date" className="filter-unified-date-box">
            <Calendar size={14} strokeWidth={1.8} className="filter-date-icon" />
            <span className="filter-date-prefix">To Date:</span>
            <input
              id="submission-to-date"
              type="date"
              className="filter-date-input"
              value={draftToDate}
              min={draftFromDate || undefined}
              onChange={(e) => {
                setDraftToDate(e.target.value)
                if (dateRangeError) setDateRangeError('')
              }}
              aria-label="To Date"
              title="To Date"
            />
          </label>

          <div className="filter-status-box">
            <CustomSelect
              name="status"
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
              options={STATUS_OPTIONS}
              placeholder="All Status"
            />
          </div>

          <button type="button" className="btn-search-filter" onClick={handleSearch}>
            <Search size={15} strokeWidth={2} /> Search
          </button>

          <button type="button" className="btn-reset-filter" onClick={handleResetFilters}>
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

        {dateRangeError && (
          <div className="filter-date-error-row">
            <span className="filter-date-error-text">{dateRangeError}</span>
          </div>
        )}

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
                          <button
                            type="button"
                            className="history-avatar-btn"
                            onClick={() => setSelectedCustomer(item)}
                            title="View customer details"
                            aria-label={`View details for ${item.fullName || 'Customer'}`}
                          >
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
                            <span className="history-avatar-hover-overlay" aria-hidden="true">
                              <Eye size={14} strokeWidth={2} />
                            </span>
                          </button>
                          <span>{item.fullName}</span>
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
                            title="View customer details"
                          >
                            <Eye size={15} strokeWidth={1.8} /> View Details
                          </button>
                          {getStatusType(item.status) === 'new-rm' && (
                            <>
                              <button
                                type="button"
                                className="btn-edit-customer"
                                onClick={() => handleEditCustomer(item)}
                                title="Edit customer details"
                                aria-label={`Edit ${item.fullName || 'Customer'}`}
                              >
                                <Edit2 size={14} strokeWidth={1.8} /> Edit
                              </button>
                              <button
                                type="button"
                                className="btn-delete-customer"
                                onClick={() => handleOpenDeleteModal(item)}
                                title="Delete customer application"
                                aria-label={`Delete ${item.fullName || 'Customer'}`}
                              >
                                <Trash2 size={14} strokeWidth={1.8} /> Delete
                              </button>
                            </>
                          )}
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

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div
          className="history-delete-modal-backdrop"
          onClick={handleCloseDeleteModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="history-delete-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-delete-modal-header">
              <div className="history-delete-modal-icon">
                <Trash2 size={20} />
              </div>
              <h3 id="delete-modal-title" className="history-delete-modal-title">
                Delete Customer Application
              </h3>
            </div>

            {deleteError && (
              <div className="history-delete-modal-error">
                {deleteError}
              </div>
            )}

            <p className="history-delete-modal-message">
              Are you sure you want to delete customer <strong>"{customerToDelete?.fullName || 'this customer'}"</strong>? This action cannot be undone.
            </p>

            <div className="history-delete-modal-actions">
              <button
                type="button"
                className="history-delete-modal-btn-cancel"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="history-delete-modal-btn-confirm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubmissionHistory
