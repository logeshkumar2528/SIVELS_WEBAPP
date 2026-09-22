import { useEffect, useState, useRef } from 'react'
import { CheckCircle2, Clock, Eye, RefreshCw, RotateCcw } from 'lucide-react'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { masterService } from '../../../../../../Core/src/services/masterService'
import { resolveDocumentTypeId } from '../../../../../../Core/src/utils/documentTypeHelper'
import { formatDateTime } from '../../../../../../Core/src/utils/dateHelper'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import { isCustomerOwnedByAgent } from '../../utils/agentOwnershipHelper'
import { normalizeApplicationStatus } from '../../../../../rm_modules/src/utils/rmContext'
import ViewCustomerModal from '../ViewCustomerModal/ViewCustomerModal'
import './SubmittedCustomers.css'

function extractArray(response) {
  if (Array.isArray(response)) return response
  if (!response || typeof response !== 'object') return []
  const candidates = [response.data, response.value, response.items, response.result, response.list]
  return candidates.find((candidate) => Array.isArray(candidate)) || []
}

function formatDate(value) {
  return formatDateTime(value, '-')
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '-'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(value)
}

function StatusBadge({ status }) {
  const value = status || 'Unknown'
  const normalized = String(value).toLowerCase()
  const isReturned = normalized.includes('return') || normalized.includes('reject')
  const isApproved = normalized.includes('approve') || normalized.includes('success') || normalized.includes('logged to ho')
  const isReview = normalized.includes('review')
  const isPending = normalized.includes('pending') || normalized.includes('draft')
  const Icon = isReturned ? RotateCcw : isApproved ? CheckCircle2 : isReview ? RefreshCw : isPending ? Clock : CheckCircle2
  const type = isReturned ? 'returned' : isApproved ? 'approved' : isReview ? 'review' : isPending ? 'pending' : 'submitted'

  return <span className={`submitted-status submitted-status--${type}`}><Icon size={14} /> {value}</span>
}

function SubmittedCustomers() {
  const { agentId, loadingAgent } = useAgentIdentity()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Photo Resolution and Caching States
  const [photoDocTypeId, setPhotoDocTypeId] = useState(null)
  const [customerPhotos, setCustomerPhotos] = useState({})
  const photoUrlsRef = useRef({})

  // Fetch DocumentTypeMaster once on mount to dynamically resolve Photo document type ID
  useEffect(() => {
    let isMounted = true
    const loadDocTypes = async () => {
      try {
        const data = await masterService.getDocumentTypes()
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

  useEffect(() => {
    if (loadingAgent || !agentId) return

    let active = true
    const loadCustomers = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await agentCustomerService.getAllCustomers()
        const records = extractArray(response)
        const agentCustomers = records
          .filter((customer) => isCustomerOwnedByAgent(customer, agentId))
          .sort((a, b) => new Date(b.createdAt || b.CreatedAt || 0) - new Date(a.createdAt || a.CreatedAt || 0))
          .map((customer) => ({
            ...customer,
            status: normalizeApplicationStatus(
              customer.status ?? customer.Status,
              customer.statusName ?? customer.StatusName
            ),
          }))
        if (active) setCustomers(agentCustomers)
      } catch (loadError) {
        console.error('Failed to load submitted customers', loadError)
        if (active) setError('Unable to load submitted customers.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCustomers()
    return () => { active = false }
  }, [agentId, loadingAgent])

  // Load Photos for submitted customers
  useEffect(() => {
    if (!photoDocTypeId || !customers || customers.length === 0) return

    let isMounted = true

    const uncheckedCustomers = customers.filter((customer) => {
      const custId = customer.agentCustomerId || customer.AgentCustomerId || customer.id
      return custId && customerPhotos[custId] === undefined
    })

    if (uncheckedCustomers.length === 0) return

    const fetchPhotos = async () => {
      for (const customer of uncheckedCustomers) {
        if (!isMounted) break
        const custId = customer.agentCustomerId || customer.AgentCustomerId || customer.id
        if (!custId) continue

        try {
          const docsRes = await agentCustomerService.getDocumentsByCustomerId(custId)
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
  }, [customers, photoDocTypeId, customerPhotos])

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

  return (
    <section className="submitted-customers" aria-labelledby="submitted-customers-title">
      <div className="submitted-customers-header">
        <div>
          <h2 id="submitted-customers-title">Submitted Customers</h2>
          <p>All customer applications submitted by you</p>
        </div>
        <span className="submitted-customers-count">{loading ? '...' : customers.length} records</span>
      </div>

      {loading ? (
        <div className="submitted-customers-message">Loading submitted customers...</div>
      ) : error ? (
        <div className="submitted-customers-message submitted-customers-message--error">{error}</div>
      ) : customers.length === 0 ? (
        <div className="submitted-customers-message">No submitted customers found.</div>
      ) : (
        <div className="submitted-customers-table-wrapper">
          <table className="submitted-customers-table">
            <thead>
              <tr>
                <th>S.NO</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Expected Loan Amount</th>
                <th>Submitted On</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => {
                const custId = customer.agentCustomerId || customer.AgentCustomerId || customer.id || `${customer.agentId}-${index}`
                const name = customer.fullName || customer.FullName || 'Unknown Customer'
                const initial = name.charAt(0).toUpperCase()
                const photoUrl = customerPhotos[custId]

                return (
                  <tr key={custId}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="submitted-customer-name">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={name}
                            className="submitted-avatar-img"
                            onError={() => handleImageError(custId)}
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                        {name}
                      </div>
                    </td>
                    <td>{customer.mobileNumber || customer.MobileNumber || '-'}</td>
                    <td>{formatCurrency(customer.expectedLoanAmount || customer.ExpectedLoanAmount)}</td>
                    <td>{formatDate(customer.createdAt || customer.CreatedAt)}</td>
                    <td><StatusBadge status={customer.status || customer.Status} /></td>
                    <td>
                      <button type="button" className="submitted-view-button" onClick={() => setSelectedCustomer(customer)}>
                        <Eye size={15} /> View Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedCustomer && <ViewCustomerModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
    </section>
  )
}

export default SubmittedCustomers
