import { Link } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import { categories } from './data/categories'
import { formatPrice } from './utils/formatprice'
import { imageUrl } from './utils/imageUrl'
import { useCart } from './hooks/cartContext'
import { useProductSearch } from './hooks/useProductSearch'
import ProductResults from './components/ProductResults'
import ProductFilters from './components/ProductFilters'
import RegionSelector from './components/RegionSelector'
import './App.css'

function LocationPage() {
  const searchState = useProductSearch()
  const {
    search, setSearch, selectedCategory, setSelectedCategory,
    selectedRegion, selectRegion, resetRegion, resetFilters, productList,
  } = searchState
  const { cart, toggleCart } = useCart()
  const visibleProducts = productList.products

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />
      <main>
        <section className="market-page-intro">
          <span className="section-kicker">LIFE IN YOUR NEIGHBORHOOD</span>
          <h1>동네생활</h1>
          <p>동네와 카테고리를 선택해 가까운 이웃의 상품을 둘러보세요.</p>
        </section>

        <section className="market-section market-page-list">
          <div className="market-heading">
            <div>
              <span className="section-kicker">EXPLORE BY NEIGHBORHOOD</span>
              <h2>
                지역별 상품{' '}
                <span className="heading-count">{visibleProducts.length}</span>
              </h2>
            </div>
          </div>

          <RegionSelector
            selectedRegion={selectedRegion.name}
            onSelect={selectRegion}
            onReset={resetRegion}
            allowFallback={false}
          />

          <div className="market-page-categories" aria-label="상품 카테고리">
            {categories.map((category) => (
              <button
                aria-pressed={selectedCategory === category}
                className={`market-category${selectedCategory === category ? ' selected' : ''}`}
                key={category}
                onClick={() => setSelectedCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>

          <ProductFilters {...searchState} />
          <ProductResults {...productList}>
          {visibleProducts.length > 0 ? (
            <div className="product-grid location-product-grid">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    <Link
                      aria-label={`${product.title} 상세 보기`}
                      className="product-image-link"
                      to={`/products/${product.id}`}
                    >
                      {product.image ? (
                        <img src={imageUrl(product.image)} alt={product.title} />
                      ) : (
                        <div
                          className="product-image-placeholder"
                          role="img"
                          aria-label="상품 사진 없음"
                        />
                      )}
                    </Link>
                    {product.badge && (
                      <span className="product-badge">{product.badge}</span>
                    )}
                  </div>
                  <div className="product-details">
                    <span className="product-category">
                      {product.location} · {product.category}
                    </span>
                    <h3>
                      <Link
                        className="product-title-link"
                        to={`/products/${product.id}`}
                      >
                        {product.title}
                      </Link>
                    </h3>
                    <div className="product-price-row">
                      <strong className="product-price">
                        {formatPrice(product.price)}
                      </strong>
                      <button
                        aria-label={
                          cart.some((item) => item.productId === String(product.id))
                            ? `${product.title} 장바구니에서 빼기`
                            : `${product.title} 장바구니에 담기`
                        }
                        aria-pressed={cart.some((item) => item.productId === String(product.id))}
                        className={`cart-button${cart.some((item) => item.productId === String(product.id)) ? ' is-in-cart' : ''}`}
                        onClick={() => toggleCart(product)}
                        type="button"
                      >
                        {cart.some((item) => item.productId === String(product.id)) ? '✓ 담김' : '+ 장바구니'}
                      </button>
                    </div>
                    <div className="product-meta">
                      <span>{product.time}</span>
                      <span className="product-likes" aria-label={`관심 ${product.likes}개`}>
                        <span aria-hidden="true">♡</span> {product.likes}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <strong>조건에 맞는 상품이 없어요</strong>
              <p>지역이나 카테고리를 바꿔 다시 찾아보세요.</p>
              <button
                onClick={resetFilters}
                type="button"
              >
                전체 상품 보기
              </button>
            </div>
          )}
          </ProductResults>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="/">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </a>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <span>© 2026 reown. All rights reserved.</span>
      </footer>
    </div>
  )
}

export default LocationPage
