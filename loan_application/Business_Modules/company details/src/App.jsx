import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import CompanyInfo from './Companyinfo/CompanyInfo.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CompanyInfo />} />
        <Route path="/company-info" element={<CompanyInfo />} />
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
