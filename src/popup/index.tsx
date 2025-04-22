// index.tsx - Entry point for popup
import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './Popup';
import './Popup.css';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  
  if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
  } else {
    console.error('Root element not found');
  }
});
