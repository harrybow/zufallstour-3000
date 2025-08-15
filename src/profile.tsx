import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Profile from './Profile'
import { I18nProvider } from './i18n'

const match = window.location.pathname.match(/^\/profil\/([^/]+)\/?$/)
const username: string = match ? decodeURIComponent(match[1]) : ''

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <Profile username={username} />
    </I18nProvider>
  </StrictMode>,
)
