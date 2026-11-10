import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { CartProvider } from './hooks/useCart'
import App from './App'
import CartPage from './pages/CartPage'
import MarketPage from './Marketpage'
import LoginPage from './login'
import SignupPage from './loginnew'
import SafeDealPage from './safedeal'
import LocationPage from './location'
import SellPage from './sell'
import ProductDetailPage from './ProductDetailPage'
import ChatRoom from './ChatRoom'
import NoticePage from './notice'
import MyPage from './mypage'
import ReviewPage from './review'
import OrderHistoryPage from './pages/OrderHistoryPage'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('React 앱을 연결할 #root 요소를 찾을 수 없습니다.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/safedeal" element={<SafeDealPage />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/products/:productId" element={<ProductDetailPage />} />
          <Route path="/chats/:roomId" element={<ChatRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  </StrictMode>,
)
