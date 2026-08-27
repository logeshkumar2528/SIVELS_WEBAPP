import { useState, useEffect } from 'react'
import { Users, ClipboardList, Send, Banknote } from 'lucide-react'
import { agentCustomerService } from '../../../../../../Core/src/services/agentCustomerService'
import { useAgentIdentity } from '../../hooks/useAgentIdentity'
import './StatCards.css'

function StatCards() {
  const { agentId, loadingAgent } = useAgentIdentity()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (loadingAgent || !agentId) return

    const fetchCustomers = async () => {
      try {
        const data = await agentCustomerService.getAllCustomers()
        const allCustomers = (Array.isArray(data) ? data : data?.data || data?.items || data?.result || data?.list || [])
        const myCustomers = allCustomers.filter(c => Number(c.agentId) === Number(agentId))
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
  const pendingToRm = customers.filter(c => {
    const s = (c.status || '').toLowerCase()
    return s.includes('pending') || s.includes('draft')
  }).length
  const totalSubmitted = customers.length

  const stats = [
    {
      id: 'customers',
      title: "Today's Customers",
      value: loading ? '...' : todayCustomers.toString(),
      label: 'Customers added today',
      trend: 'Derived from API',
      theme: 'green',
      icon: Users,
    },
    {
      id: 'pending-rm',
      title: 'Pending to RM',
      value: loading ? '...' : pendingToRm.toString(),
      label: 'Waiting for RM review',
      trend: 'Derived from API',
      theme: 'yellow',
      icon: ClipboardList,
    },
    {
      id: 'submitted',
      title: 'Total Submitted',
      value: loading ? '...' : totalSubmitted.toString(),
      label: 'Total customers submitted',
      trend: 'Derived from API',
      theme: 'blue',
      icon: Send,
    },
    {
      id: 'pending-loans',
      title: 'Pending Loans',
      value: '30', // Leave as is for now
      label: 'Loans pending collection',
      trend: '> View Details',
      theme: 'red',
      icon: Banknote,
    },
  ]

  return (
    <div className="stat-cards">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.id} className={`stat-card stat-card--${stat.theme}`}>
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
            <div className={`stat-card-trend stat-card-trend--${stat.theme}`}>
              {stat.trend}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatCards
