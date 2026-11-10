import { useState } from "react"
import { Link } from "react-router-dom"
import SiteHeader from "../components/SiteHeader"
import { useCart } from "../hooks/cartContext"
import { formatPrice } from "../utils/formatprice"
import "./CartPage.css"

export default function CartPage() {
  const [search, setSearch] = useState("")
  const { cart, loading, removeFromCart } = useCart()

  return (
    <div className="app-shell cart-page">
      <SiteHeader search={search} onSearchChange={setSearch} />
      <main className="cart-main">
        <div className="cart-heading">
          <div>
            <span className="section-kicker">SAVED NEIGHBORHOOD FINDS</span>
            <h1>내 장바구니</h1>
          </div>
          <span className="cart-count">담은 상품 {cart.length}개</span>
        </div>

        {loading ? (
          <p className="cart-empty">장바구니를 불러오는 중...</p>
        ) : cart.length > 0 ? (
          <div className="cart-list">
            {cart.map((product) => (
              <article className="cart-item" key={product.productId}>
                <Link
                  aria-label={`${product.title} 상세 보기`}
                  className="cart-item-image"
                  to={`/products/${product.productId}`}
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" />
                  ) : (
                    <span aria-hidden="true">▧</span>
                  )}
                </Link>
                <div className="cart-item-info">
                  <span>{product.location} · {product.category}</span>
                  <Link className="cart-item-title" to={`/products/${product.productId}`}>
                    {product.title}
                  </Link>
                  <strong>{formatPrice(product.price)}</strong>
                </div>
                <div className="cart-item-actions">
                  <Link to={`/products/${product.productId}`}>상품 보기</Link>
                  <button
                    onClick={() => void removeFromCart(product.productId)}
                    type="button"
                  >
                    담기 취소
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="cart-empty">
            <span aria-hidden="true">▱</span>
            <h2>장바구니가 비어 있어요</h2>
            <p>마음에 드는 동네 상품을 장바구니에 담아 모아보세요.</p>
            <Link to="/market">중고거래 둘러보기</Link>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <span>© 2026 reown. All rights reserved.</span>
      </footer>
    </div>
  )
}
