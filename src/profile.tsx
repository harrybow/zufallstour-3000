import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Profile from './Profile';
import { I18nProvider } from './i18n';

const params = new URLSearchParams(window.location.search);
const username = params.get('user') ?? '';

createRoot(document.getElementById('root')!)
  .render(
    <StrictMode>
      <I18nProvider>
        <Profile username={username} />
      </I18nProvider>
    </StrictMode>,
  );
