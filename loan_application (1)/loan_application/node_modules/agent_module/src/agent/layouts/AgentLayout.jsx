import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import Header from '../components/Header/Header'
import '../styles/global.css'
import './AgentLayout.css'

function AgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="agent-layout">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

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
