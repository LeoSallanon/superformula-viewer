import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const fallback = document.getElementById('gh-pages-hint');
if (fallback) {
  fallback.remove();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
