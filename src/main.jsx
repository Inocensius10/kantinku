import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AppProvider } from './contexts/AppContext'
import './styles.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider><App /></AppProvider>
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '14px', fontWeight: 600 } }} />
    </QueryClientProvider>
  </StrictMode>,
)
