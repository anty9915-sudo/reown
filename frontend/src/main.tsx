import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App'
import MarketPage from './Marketpage'
import LoginPage from './login'
import SignupPage from './loginnew'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('React 앱을 연결할 #root 요소를 찾을 수 없습니다.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
