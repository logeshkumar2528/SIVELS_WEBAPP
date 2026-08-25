import { Routes, Route, Navigate } from 'react-router-dom'
import AgentLayout from './agent/layouts/AgentLayout'
import Dashboard from './agent/pages/Dashboard/Dashboard'
import AddCustomer from './agent/pages/AddCustomer/AddCustomer'
import SubmissionHistory from './agent/pages/SubmissionHistory/SubmissionHistory'
import Profile from './agent/pages/Profile/Profile'
import CustomerOnboarding from './agent/pages/CustomerOnboarding/CustomerOnboarding'

function App() {
  return (
    <Routes>
      {/* Root redirect to /Agent/dashboard */}
      <Route path="/" element={<Navigate to="/Agent/dashboard" replace />} />

      {/* Base Agent Route */}
      <Route path="/Agent" element={<AgentLayout />}>
        <Route index element={<Dashboard />} />
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
