import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import { categories } from './data/categories'
import { products } from './data/products'
import { formatPrice } from './utils/formatprice'
import { imageUrl } from './utils/imageUrl'
import RegionSelector from './components/RegionSelector'
import { getSelectedRegion, saveSelectedRegion } from './utils/selectedRegion'
import './App.css'

function MarketPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [activeTab, setActiveTab] = useState('추천')
  const [favorites, setFavorites] = useState<number[]>([])
  const [selectedRegion, setSelectedRegion] = useState(getSelectedRegion)

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const filtered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === '전체' || product.category === selectedCategory
      const matchesSearch =
        !keyword ||
        `${product.title} ${product.category} ${product.location}`
          .toLowerCase()
          .includes(keyword)
      return matchesCategory && matchesSearch
    })

    if (activeTab === '인기순') {
      return filtered.slice().sort((a, b) => b.likes - a.likes)
    }
    return filtered
  }, [activeTab, search, selectedCategory])

  const toggleFavorite = (id: number) => {
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
              selectedRegion={selectedRegion}
              onSelect={(region) => {
                saveSelectedRegion(region)
                setSelectedRegion(region)
              }}
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

          <div className="market-toolbar">
            <div className="market-tabs" role="tablist" aria-label="매물 정렬">
              {['추천', '최신순', '인기순'].map((tab) => (
                <button
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? 'tab-active' : ''}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            <span className="result-caption">
              가까운 순으로 보여드려요 <span aria-hidden="true">⌖</span>
            </span>
          </div>

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
                        <img src={imageUrl(product.image)} alt={product.title} />
                      </Link>
                      {product.badge && (
                        <span className="product-badge">{product.badge}</span>
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
                      <strong className="product-price">
                        {formatPrice(product.price)}
                      </strong>
                      <div className="product-meta">
                        <span>
                          {product.location} · {product.time}
                        </span>
                        <span className="product-likes">
                          <span aria-hidden="true">♡</span>{' '}
                          {product.likes + Number(isFavorite)}
                        </span>
                      </div>
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
                onClick={() => {
                  setSearch('')
                  setSelectedCategory('전체')
                }}
                type="button"
              >
                전체 매물 보기
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

export default MarketPage