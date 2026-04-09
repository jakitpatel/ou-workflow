import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from '@/app/providers/AppProviders'

import './index.css'
import reportWebVitals from './reportWebVitals.ts'

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <AppProviders />
    </StrictMode>,
  )
}

reportWebVitals()
