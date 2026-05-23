import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import SmoothScrollRoot from './components/SmoothScrollRoot';
import './index.css';
import { registerServiceWorker } from './lib/pwa';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SmoothScrollRoot>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SmoothScrollRoot>
  </StrictMode>
);
