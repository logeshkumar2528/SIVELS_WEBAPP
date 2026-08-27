import { Routes, Route, Navigate } from 'react-router-dom'
import AgentLayout from './agent/layouts/AgentLayout'
import Dashboard from './agent/pages/Dashboard/Dashboard'
import AddCustomer from './agent/pages/AddCustomer/AddCustomer'
import SubmissionHistory from './agent/pages/SubmissionHistory/SubmissionHistory'
import Profile from './agent/pages/Profile/Profile'
import CustomerOnboarding from './agent/pages/CustomerOnboarding/CustomerOnboarding'
import './index.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Agent/dashboard" replace />} />
      <Route path="/Agent" element={<Navigate to="/Agent/dashboard" replace />} />

      {/* Standalone mode routes */}
      <Route path="/Agent" element={<AgentLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="add-customer" element={<AddCustomer />} />
        <Route path="submission-history" element={<SubmissionHistory />} />
        <Route path="profile" element={<Profile />} />
        <Route path="customers/new" element={<Navigate to="/Agent/add-customer" replace />} />
      </Route>

      {/* Fallback wildcard redirect */}
      <Route path="*" element={<Navigate to="/Agent/dashboard" replace />} />
    </Routes>
  )
}

export default App
