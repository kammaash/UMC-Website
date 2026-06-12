import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './shared/design/tokens.css'
import './shared/design/base.css'
import './shared/design/neo.css'
import { AuthProvider } from './shared/auth/AuthContext'
import App from './app/App'

// The same bundle is served at two roots: the portal at /member/* and the
// standalone sign-in page at /login. Match the router basename to wherever
// we're mounted so both contexts route correctly.
const basename = window.location.pathname.startsWith('/member') ? '/member' : ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
