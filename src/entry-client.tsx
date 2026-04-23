import { StartClient } from '@tanstack/react-start'
import { createRoot } from 'react-dom/client'
import { getRouter } from './router'

const router = getRouter()
const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(<StartClient router={router} />)
}
