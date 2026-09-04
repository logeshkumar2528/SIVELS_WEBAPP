import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Eye, RefreshCw, RotateCcw } from 'lucide-react'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { formatDateTime } from '../../../../../../Core/src/utils/dateHelper'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
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
  const isApproved = normalized.includes('approve') || normalized.includes('success')
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
          .filter((customer) => Number(customer.agentId || customer.AgentId) === Number(agentId))
          .sort((a, b) => new Date(b.createdAt || b.CreatedAt || 0) - new Date(a.createdAt || a.CreatedAt || 0))
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
                const name = customer.fullName || customer.FullName || 'Unknown Customer'
                const initial = name.charAt(0).toUpperCase()
                return (
                  <tr key={customer.agentCustomerId || customer.id || `${customer.agentId}-${index}`}>
                    <td>{index + 1}</td>
                    <td><div className="submitted-customer-name"><span>{initial}</span>{name}</div></td>
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
