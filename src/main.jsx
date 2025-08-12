import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Profile from './Profile.jsx'
import { I18nProvider } from './i18n.jsx'

// Detect direct profile links (with optional trailing slash)
const match = window.location.pathname.match(/^\/profile\/([^/]+)\/?$/);
const Root = match ? <Profile username={decodeURIComponent(match[1])} /> : <App />;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      {Root}
    </I18nProvider>
  </StrictMode>,
)
