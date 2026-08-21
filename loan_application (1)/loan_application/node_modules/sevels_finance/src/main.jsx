import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/reset.css'
import './styles/variables.css'
import './styles/global.css'
import './styles/tailwind.css'
import './styles/responsive/responsive.css'
import './bootstrap/bootstrap';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
