import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './super_tutor_de_matem_tica';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found in DOM');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
