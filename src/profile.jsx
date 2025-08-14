import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Profile from './Profile.jsx'
import { I18nProvider } from './i18n.jsx'

const match = window.location.pathname.match(/^\/profil\/([^/]+)\/?$/)
const username = match ? decodeURIComponent(match[1]) : ''

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <Profile username={username} />
    </I18nProvider>
  </StrictMode>,
)
