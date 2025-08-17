import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Profile from './Profile';
import { I18nProvider } from './i18n';

export function extractUsername(search: string, pathname: string): string {
  const params = new URLSearchParams(search);
  const queryUser = params.get('user');
  if (queryUser) return queryUser;

  const match = pathname.match(/^\/(?:profil|profile)\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

let username = '';
if (typeof window !== 'undefined') {
  username = extractUsername(window.location.search, window.location.pathname);
}

if (typeof document !== 'undefined') {
  createRoot(document.getElementById('root')!)
    .render(
      <StrictMode>
        <I18nProvider>
          <Profile username={username} />
        </I18nProvider>
      </StrictMode>,
    );
}
