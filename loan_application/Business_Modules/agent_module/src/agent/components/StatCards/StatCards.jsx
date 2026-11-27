import { useState, useEffect } from 'react'
import { Users, ClipboardList, Send, Banknote, Building2 } from 'lucide-react'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { extractWorkflowStatus } from '../../../../../../Core/src/utils/applicationWorkflowStatus'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import { isCustomerOwnedByAgent } from '../../utils/agentOwnershipHelper'
import { WORKFLOW_STATUS_CODES } from '../../utils/workflowStatusDisplay'
import './StatCards.css'

function StatCards({ activeSection, onTotalSubmittedClick }) {
  const { agentId, loadingAgent } = useAgentIdentity()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (loadingAgent) return

    if (!agentId) {
      setCustomers([])
      setLoading(false)
      return
    }

    const fetchCustomers = async () => {
      try {
        const data = await agentCustomerService.getAllCustomers()
        const allCustomers = (Array.isArray(data) ? data : data?.data || data?.items || data?.result || data?.list || [])
         const myCustomers = allCustomers
           .filter(c => isCustomerOwnedByAgent(c, agentId))
           .map((customer) => ({
             ...customer,
             workflowStatus: extractWorkflowStatus(customer),
           }))
        setCustomers(myCustomers)
      } catch (err) {
        console.error("Failed to load customers for stats", err)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [agentId, loadingAgent])

  const today = new Date().toISOString().split('T')[0]
  const todayCustomers = customers.filter(c => (c.createdAt || '').startsWith(today)).length
  const pendingToRm = customers.filter(
    (customer) => customer.workflowStatus?.workflowStatusCode === WORKFLOW_STATUS_CODES.RM_VERIFICATION_PENDING
  ).length
  const pendingToBackoffice = customers.filter((customer) => [
    WORKFLOW_STATUS_CODES.BO_VERIFICATION_PENDING,
    WORKFLOW_STATUS_CODES.BO_VERIFICATION_IN_PROGRESS,
  ].includes(customer.workflowStatus?.workflowStatusCode)).length
  const totalSubmitted = customers.length

  const stats = [
    {
      id: 'customers',
      title: "Today's Customers",
      value: loading ? '...' : todayCustomers.toString(),
      label: 'Customers added today',
      theme: 'green',
      icon: Users,
    },
    {
      id: 'pending-rm',
      title: 'Pending to RM',
      value: loading ? '...' : pendingToRm.toString(),
      label: 'Waiting for RM review',
      theme: 'yellow',
      icon: ClipboardList,
    },
    {
      id: 'submitted',
      title: 'Total Submitted',
      value: loading ? '...' : totalSubmitted.toString(),
      label: 'Total customers submitted',
      theme: 'blue',
      icon: Send,
    },
    {
      id: 'pending-loans',
      title: 'EMI Pending',
      value: '30', // Leave as is for now
      label: 'Loans pending collection',
      trend: '> View Details',
      theme: 'red',
      icon: Banknote,
    },
    {
      id: 'pending-backoffice',
      title: 'Pending to Backoffice',
      value: loading ? '...' : pendingToBackoffice.toString(),
      label: 'Waiting for Backoffice review',
      theme: 'blue',
      icon: Building2,
    },
  ]

  return (
    <div className="stat-cards">
      {stats.map((stat) => {
        const Icon = stat.icon
        const isClickable = stat.id === 'submitted'
        const handleClick = stat.id === 'submitted' ? onTotalSubmittedClick : undefined
        const ariaLabel = stat.id === 'submitted' ? 'Show submitted customers' : undefined

        return (
          <div
            key={stat.id}
            className={`stat-card stat-card--${stat.theme} ${isClickable ? 'stat-card--clickable' : ''}`}
            onClick={handleClick}
            onKeyDown={isClickable ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') handleClick?.()
            } : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={ariaLabel}
          >
            <div className="stat-card-header">
              <div className={`stat-card-icon-circle stat-card-icon-circle--${stat.theme}`}>
                <Icon size={20} strokeWidth={2} color="#FFFFFF" />
              </div>
              <div className="stat-card-header-info">
                <span className="stat-card-title">{stat.title}</span>
                <span className="stat-card-value">{stat.value}</span>
              </div>
            </div>
            <div className="stat-card-label">{stat.label}</div>
            {stat.trend && (
              <div className={`stat-card-trend stat-card-trend--${stat.theme}`}>
                {stat.trend}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default StatCards
