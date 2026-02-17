import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './ThemeContext'; // Import your Provider here
import './index.css';

const MOUNT_ID = 'phishguard-root-container';

const mountApp = () => {
  // Check if we are in Gmail (Extension Mode)
  const rootElement = document.getElementById(MOUNT_ID);

  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        {/* Wrap App here to provide theme context to the whole sidebar */}
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );
  } else {
    // Fallback for local development (npm start)
    const localRoot = document.getElementById('root');
    if (localRoot) {
      const root = ReactDOM.createRoot(localRoot);
      root.render(
        <ThemeProvider>
          <App />
        </ThemeProvider>
      );
    } else {
      // If Gmail is still loading, wait 500ms and try again
      setTimeout(mountApp, 500);
    }
  }
};

mountApp();