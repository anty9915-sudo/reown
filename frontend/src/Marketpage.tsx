import { useState } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import { categories } from './data/categories'
import { formatPrice } from './utils/formatprice'
import { imageUrl } from './utils/imageUrl'
import RegionSelector from './components/RegionSelector'
import { useCart } from './hooks/cartContext'
import { useProductSearch } from './hooks/useProductSearch'
import ProductResults from './components/ProductResults'
import ProductFilters from './components/ProductFilters'
import './App.css'

function MarketPage() {
  const searchState = useProductSearch()
  const {
    search, setSearch, selectedCategory, setSelectedCategory,
    selectedRegion, selectRegion, resetRegion, resetFilters, productList,
  } = searchState
  const [favorites, setFavorites] = useState<string[]>([])
  const { cart, toggleCart } = useCart()
  const visibleProducts = productList.products

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favorite) => favorite !== id)
        : [...current, id],
    )
  }

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />
      <main>
        <section className="market-page-intro">
          <span className="section-kicker">REOWN NEIGHBORHOOD MARKET</span>
          <h1>우리 동네 중고거래</h1>
          <p>가까운 이웃의 좋은 물건을 둘러보세요.</p>
        </section>

        <section className="market-section market-page-list" id="market">
          <div className="market-heading">
            <div>
              <span className="section-kicker">YOUR NEIGHBORHOOD FINDS</span>
              <h2>
                지금 우리 동네 매물{' '}
                <span className="heading-count">{visibleProducts.length}</span>
              </h2>
            </div>
            <RegionSelector
              selectedRegion={selectedRegion.name}
              onSelect={selectRegion}
              onReset={resetRegion}
              allowFallback={false}
            />
          </div>

          <div className="market-page-categories" aria-label="카테고리">
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
            <div className="product-grid">
              {visibleProducts.map((product) => {
                const isFavorite = favorites.includes(product.id)
                return (
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
                      {product.soldOut && (
                        <span className="product-soldout-badge">품절</span>
                      )}
                      <button
                        aria-label={isFavorite ? '찜 취소' : '찜하기'}
                        aria-pressed={isFavorite}
                        className={`favorite-button${isFavorite ? ' is-favorite' : ''}`}
                        onClick={(event) => {
                          event.preventDefault()
                          toggleFavorite(product.id)
                        }}
                        type="button"
                      >
                        {isFavorite ? '♥' : '♡'}
                      </button>
                    </div>
                    <div className="product-details">
                      <span className="product-category">{product.category}</span>
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
                          onClick={() =>
                            toggleCart(product)
                          }
                          type="button"
                        >
                          {cart.some((item) => item.productId === String(product.id)) ? '✓ 담김' : '+ 장바구니'}
                        </button>
                      </div>
                      <div className="product-meta">
                        <span>
                          {product.location} · {product.time}
                        </span>
                        <span className="product-likes">
                          <span aria-hidden="true">♡</span>{' '}
                          {product.likes + Number(isFavorite)}
                        </span>
                      </div>
                      {product.sellerName && (
                        <span className="product-seller">
                          판매자 · {product.sellerName}
                        </span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <strong>찾으시는 매물이 없어요</strong>
              <p>검색어나 카테고리를 바꿔 다시 찾아보세요.</p>
              <button
                onClick={resetFilters}
                type="button"
              >
                전체 매물 보기
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

export default MarketPage
