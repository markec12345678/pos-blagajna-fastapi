import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import CustomerOrderDisplay from './CustomerOrderDisplay'

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

const path = window.location.pathname
const isDisplay = path.startsWith('/display/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDisplay ? <CustomerOrderDisplay /> : <App />}
  </StrictMode>,
)
