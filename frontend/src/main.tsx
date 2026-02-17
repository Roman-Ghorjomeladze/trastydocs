import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/index.ts'
import { initPaddle } from './lib/paddle.ts'
import App from './App.tsx'

// Initialize Paddle.js for payments
const paddleToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
const paddleEnv = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
if (paddleToken) {
  initPaddle(paddleToken, paddleEnv as 'sandbox' | 'production');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
