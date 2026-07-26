import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from './ErrorBoundary'
import App from './App'
import CustomerOrderDisplay from './CustomerOrderDisplay'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              newWorker.postMessage('skipWaiting')
            }
          })
        }
      })
    }).catch(() => {})
  })
}

const path = window.location.pathname
const isDisplay = path.startsWith('/display/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isDisplay ? <CustomerOrderDisplay /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
