import { createRoot } from 'react-dom/client';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { LocaleProvider } from './context/LocaleContext';
import { LanguageProvider } from './context/LanguageContext';

import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <AuthProvider>
      <LocationProvider>
        <LocaleProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </LocaleProvider>
      </LocationProvider>
    </AuthProvider>
  </HelmetProvider>
);

// Register Service Worker for PWA (Production Only)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  } else {
    // In development mode, ensure any existing service workers are unregistered
    // to prevent caching/intercepting Vite dynamic imports & HMR modules
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister().then(unregistered => {
          if (unregistered) {
            console.log('Development mode: Unregistered leftover service worker');
          }
        });
      }
    });
    // Clear caches in dev mode to prevent stale chunk errors
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }
  }
}

