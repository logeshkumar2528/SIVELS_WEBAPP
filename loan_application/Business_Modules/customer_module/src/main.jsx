import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { LoadingProvider } from '../../../Core/src/context/LoadingContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LoadingProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LoadingProvider>
  </StrictMode>,
)
