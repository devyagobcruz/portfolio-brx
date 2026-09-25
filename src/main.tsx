import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// TEMPORÁRIO: ?cor=laranja volta ao laranja antigo, para comparar com o roxo. Remover quando decidir.
if (new URLSearchParams(location.search).get('cor') === 'laranja') document.documentElement.dataset.accent = 'laranja'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
