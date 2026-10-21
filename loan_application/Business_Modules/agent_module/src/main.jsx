import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from '../../../Core/src/context/AuthContext'
import { LoadingProvider } from '../../../Core/src/context/LoadingContext'
import RequireAuth from '../../../Core/src/auth/RequireAuth'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LoadingProvider>
        <BrowserRouter>
          <RequireAuth allowedRoles={['AGENT']}>
            <App />
          </RequireAuth>
        </BrowserRouter>
      </LoadingProvider>
    </AuthProvider>
  </StrictMode>,
)
