import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext'; 
import './index.css';

const mountApp = () => {
  const rootElement = document.getElementById('phishguard-root-container');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );
  } else {
    // Polling for the container injected by content.js
    setTimeout(mountApp, 300);
  }
};

mountApp();