import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import Header from '../components/Header/Header'
import { useAgentIdentity } from '../hooks/useAgentIdentity'
import { agentCustomerService } from '../../../../../Core/src/services/agentCustomerService'
import { isCustomerOwnedByAgent } from '../utils/agentOwnershipHelper'
import '../styles/global.css'
import './AgentLayout.css'

function AgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { agentId, loadingAgent } = useAgentIdentity()
  const [badgeCounts, setBadgeCounts] = useState({ submissionHistory: 0 })

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  useEffect(() => {
    let isMounted = true
    async function loadSubmissionsCount() {
      if (loadingAgent || !agentId) return
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
        const myCustomers = allCustomers.filter((c) => isCustomerOwnedByAgent(c, agentId))
        if (isMounted) {
          setBadgeCounts({ submissionHistory: myCustomers.length })
        }
      } catch (err) {
        console.error('Failed to load agent submission count for sidebar badge:', err)
      }
    }
    loadSubmissionsCount()
    return () => {
      isMounted = false
    }
  }, [agentId, loadingAgent])

  return (
    <div className="agent-layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} badgeCounts={badgeCounts} />

      <div className="agent-main-wrapper">
        <Header />
        <main className="agent-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AgentLayout
