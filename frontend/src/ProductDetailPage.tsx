import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import { products } from './data/products'
import { formatPrice } from './utils/formatprice'
import { imageUrl } from './utils/imageUrl'
import './ProductDetail.css'

function ProductDetailPage() {
  const { productId } = useParams()
  const [search, setSearch] = useState('')
  const product = products.find((item) => item.id === Number(productId))

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />
      {product ? (
        <main className="product-detail-main">
          <Link className="product-detail-back" to="/market">
            <span aria-hidden="true">←</span> 상품 목록으로
          </Link>

          <article className="product-detail">
            <div className="product-detail-image">
              <img src={imageUrl(product.image)} alt={product.title} />
              {product.badge && (
                <span className="product-badge">{product.badge}</span>
              )}
            </div>

            <div className="product-detail-info">
              <div className="product-detail-category">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>{product.location}</span>
              </div>
              <h1>{product.title}</h1>
              <div className="product-detail-meta">
                <span>{product.time}</span>
                <span aria-label={`관심 ${product.likes}개`}>
                  <span aria-hidden="true">♡</span> 관심 {product.likes}
                </span>
              </div>
              <strong className="product-detail-price">
                {formatPrice(product.price)}
              </strong>

              <div className="product-detail-divider" />
              <section aria-labelledby="product-description-title">
                <h2 id="product-description-title">상품 설명</h2>
                <p>
                  등록된 상품 정보를 확인해 주세요. 상품의 자세한 상태와 거래
                  조건은 판매자에게 문의해 주세요.
                </p>
              </section>

              <div className="product-detail-location">
                <span aria-hidden="true">⌖</span>
                <div>
                  <strong>거래 지역</strong>
                  <span>{product.location}</span>
                </div>
              </div>

              <button className="product-detail-contact" disabled type="button">
                판매자에게 문의하기
              </button>
              <p className="product-detail-note">채팅 문의 기능은 준비 중이에요.</p>
            </div>
          </article>

          <section className="product-detail-safety">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>안전한 거래를 위해</strong>
              <p>거래 전 상품 상태와 약속 내용을 판매자와 충분히 확인해 주세요.</p>
            </div>
            <Link to="/safedeal">안전거래 안내 <span aria-hidden="true">→</span></Link>
          </section>
        </main>
      ) : (
        <main className="product-detail-main">
          <section className="product-detail-not-found">
            <span aria-hidden="true">⌕</span>
            <h1>상품을 찾을 수 없어요</h1>
            <p>상품이 삭제되었거나 주소가 올바르지 않습니다.</p>
            <Link to="/market">상품 둘러보기</Link>
          </section>
        </main>
      )}

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

export default ProductDetailPage
