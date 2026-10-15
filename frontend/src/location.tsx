import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import { categories } from './data/categories'
import { products } from './data/products'
import { formatPrice } from './utils/formatprice'
import { imageUrl } from './utils/imageUrl'
import './App.css'

function LocationPage() {
  const [search, setSearch] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('전체 지역')
  const [selectedCategory, setSelectedCategory] = useState('전체')

  const regions = useMemo(
    () => [...new Set(products.map((product) => product.location))],
    [],
  )

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesRegion =
        selectedRegion === '전체 지역' || product.location === selectedRegion
      const matchesCategory =
        selectedCategory === '전체' || product.category === selectedCategory
      const matchesSearch =
        !keyword ||
        `${product.title} ${product.category} ${product.location}`
          .toLowerCase()
          .includes(keyword)

      return matchesRegion && matchesCategory && matchesSearch
    })
  }, [search, selectedCategory, selectedRegion])

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

          <div className="market-page-categories" aria-label="지역 카테고리">
            {['전체 지역', ...regions].map((region) => (
              <button
                aria-pressed={selectedRegion === region}
                className={`market-category${selectedRegion === region ? ' selected' : ''}`}
                key={region}
                onClick={() => setSelectedRegion(region)}
                type="button"
              >
                {region}
              </button>
            ))}
          </div>

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
                      <img src={imageUrl(product.image)} alt={product.title} />
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
                    <strong className="product-price">
                      {formatPrice(product.price)}
                    </strong>
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
                onClick={() => {
                  setSearch('')
                  setSelectedRegion('전체 지역')
                  setSelectedCategory('전체')
                }}
                type="button"
              >
                전체 상품 보기
              </button>
            </div>
          )}
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
