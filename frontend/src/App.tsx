import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import { products } from "./data/products";
import { imageUrl } from "./utils/imageUrl";
import SiteHeader from "./components/SiteHeader";
import { formatPrice } from "./utils/formatprice";

const allRegionsLabel = "전체지역";

function App() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("추천");
  const [selectedRegion, setSelectedRegion] = useState(allRegionsLabel);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);

  const regions = useMemo(
    () => [...new Set(products.map((product) => product.location))],
    [],
  );
  const featuredProduct = useMemo(
    () =>
      products.find((product) => product.location === selectedRegion) ??
      products[0],
    [selectedRegion],
  );

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "전체" || product.category === selectedCategory;
      const matchesRegion =
        selectedRegion === allRegionsLabel ||
        product.location === selectedRegion;
      const matchesSearch =
        !keyword ||
        `${product.title} ${product.category} ${product.location}`
          .toLowerCase()
          .includes(keyword);
      return matchesCategory && matchesRegion && matchesSearch;
    });

    if (activeTab === "인기순") {
      return filtered
        .slice()
        .sort((a, b) => b.likes - a.likes);
    }
    return filtered;
  }, [activeTab, search, selectedCategory, selectedRegion]);

  const toggleFavorite = (id: number) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favorite) => favorite !== id)
        : [...current, id],
    );
  };

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />

      <main>
        <section className="hero" aria-label="동네 중고거래">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" /> 우리 동네 취향 거래
            </div>
            <h1>
              잘 쓰던 물건,
              <br />
              <span>새 주인을 만나도록.</span>
            </h1>
            <p>
              가까운 이웃과 나누는 기분 좋은 거래,
              <br className="mobile-break" /> reown에서 시작해요.
            </p>
            <a className="hero-cta" href="#market">
              지금 구경하기 <span aria-hidden="true">↗</span>
            </a>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>민</span>
                <span>서</span>
                <span>지</span>
                <span>＋</span>
              </div>
              <span>
                <strong>2,400+</strong>명의 이웃이 함께하고 있어요
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div aria-hidden="true" className="hero-orbit orbit-one" />
            <div aria-hidden="true" className="hero-orbit orbit-two" />
            <div aria-hidden="true" className="hero-note note-top">
              <span>✦</span> 좋은 물건의 새로운 시작
            </div>
            {featuredProduct && (
              <div className="hero-product-card">
                <img
                  src={imageUrl(featuredProduct.image)}
                  alt={featuredProduct.title}
                />
                <div className="hero-product-info">
                  <div>
                    <span>오늘의 발견 · {featuredProduct.location}</span>
                    <span className="live-dot" />
                  </div>
                  <strong>{featuredProduct.title}</strong>
                  <b>{formatPrice(featuredProduct.price)}</b>
                </div>
              </div>
            )}
            <div aria-hidden="true" className="floating-tag tag-left">
              <span>♡</span> 마음에 쏙
            </div>
            <div aria-hidden="true" className="floating-tag tag-right">
              <span>↗</span> 동네 직거래
            </div>
            <div aria-hidden="true" className="hero-sparkle sparkle-one">✳</div>
            <div aria-hidden="true" className="hero-sparkle sparkle-two">✦</div>
          </div>
          <div className="hero-location-selector">
            <button
              aria-expanded={isRegionSelectorOpen}
              aria-haspopup="dialog"
              className="hero-location"
              onClick={() => setIsRegionSelectorOpen((isOpen) => !isOpen)}
              type="button"
            >
              <span aria-hidden="true">⌖</span>
              <span className="hero-location-name">{selectedRegion}</span>
              <span aria-hidden="true" className="location-chevron">⌄</span>
            </button>
            {isRegionSelectorOpen && (
              <div
                aria-label="지역 선택"
                className="home-region-popover hero-region-popover"
                role="dialog"
              >
                <span className="home-region-label">전체 지역</span>
                <button
                  aria-pressed={selectedRegion === allRegionsLabel}
                  className={`home-region-option${selectedRegion === allRegionsLabel ? " selected" : ""}`}
                  onClick={() => {
                    setSelectedRegion(allRegionsLabel);
                    setIsRegionSelectorOpen(false);
                  }}
                  type="button"
                >
                  전체지역
                </button>
                <span className="home-region-label">지역 카테고리</span>
                <div className="home-region-options">
                  {regions.map((region) => (
                    <button
                      aria-pressed={selectedRegion === region}
                      className={`home-region-option${selectedRegion === region ? " selected" : ""}`}
                      key={region}
                      onClick={() => {
                        setSelectedRegion(region);
                        setIsRegionSelectorOpen(false);
                      }}
                      type="button"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="category-section" aria-label="카테고리">
          <div className="category-heading">
            <div>
              <span className="section-kicker">EXPLORE BY CATEGORY</span>
              <h2>무엇을 찾고 있나요?</h2>
            </div>
            <a className="text-link" href="#market">
              전체 카테고리 <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="category-list">
            <button
              className={`category-item ${selectedCategory === "전체" ? "selected" : ""}`}
              onClick={() => setSelectedCategory("전체")}
              type="button"
            >
              <span className="category-icon all-icon">✳</span>
              <span>전체보기</span>
            </button>
            <button
              className={`category-item ${selectedCategory === "디지털기기" ? "selected" : ""}`}
              onClick={() => setSelectedCategory("디지털기기")}
              type="button"
            >
              <span className="category-icon">⌁</span>
              <span>디지털기기</span>
            </button>
            <button
              className={`category-item ${selectedCategory === "가구·인테리어" ? "selected" : ""}`}
              onClick={() => setSelectedCategory("가구·인테리어")}
              type="button"
            >
              <span className="category-icon">⌂</span>
              <span>가구·인테리어</span>
            </button>
            <button
              className={`category-item ${selectedCategory === "패션의류" ? "selected" : ""}`}
              onClick={() => setSelectedCategory("패션의류")}
              type="button"
            >
              <span className="category-icon">♧</span>
              <span>패션의류</span>
            </button>
            <button
              className={`category-item ${selectedCategory === "생활가전" ? "selected" : ""}`}
              onClick={() => setSelectedCategory("생활가전")}
              type="button"
            >
              <span className="category-icon">◉</span>
              <span>생활가전</span>
            </button>
            <button
              className={`category-item ${selectedCategory === "취미·게임" ? "selected" : ""}`}
              onClick={() => setSelectedCategory("취미·게임")}
              type="button"
            >
              <span className="category-icon">♬</span>
              <span>취미·게임</span>
            </button>
          </div>
        </section>

        <section className="market-section" id="market">
          <div className="market-heading">
            <div>
              <span className="section-kicker">YOUR NEIGHBORHOOD FINDS</span>
              <h2>
                지금 우리 동네 매물{" "}
                <span className="heading-count">{visibleProducts.length}</span>
              </h2>
            </div>
          </div>
          <div className="market-toolbar">
            <div className="market-tabs" role="tablist" aria-label="매물 정렬">
              {["추천", "최신순", "인기순"].map((tab) => (
                <button
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? "tab-active" : ""}
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
                    <button
                      aria-label={
                        favorites.includes(product.id) ? "찜 취소" : "찜하기"
                      }
                      aria-pressed={favorites.includes(product.id)}
                      className={`favorite-button ${favorites.includes(product.id) ? "is-favorite" : ""}`}
                      onClick={(event) => {
                        event.preventDefault();
                        toggleFavorite(product.id);
                      }}
                      type="button"
                    >
                      {favorites.includes(product.id) ? "♥" : "♡"}
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
                        <span aria-hidden="true">♡</span>{" "}
                        {product.likes + Number(favorites.includes(product.id))}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <strong>찾으시는 매물이 없어요</strong>
              <p>검색어나 카테고리를 바꿔 다시 찾아보세요.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("전체");
                  setSelectedRegion(allRegionsLabel);
                }}
              >
                전체 매물 보기
              </button>
            </div>
          )}
          <a className="more-button" href="/market">
            우리 동네 매물 더 보기 <span aria-hidden="true">↓</span>
          </a>
        </section>

        <section className="safe-trade-banner" id="safe-trade">
          <div className="safe-icon" aria-hidden="true">
            ✓
          </div>
          <div>
            <span className="section-kicker">TRADE WITH PEACE OF MIND</span>
            <h2>처음 거래도 안심할 수 있도록</h2>
            <p>reown의 안전결제로 소중한 거래를 지켜드려요.</p>
          </div>
          <Link to="/safedeal">
            안전거래 알아보기 <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </a>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <span>© 2026 reown. All rights reserved.</span>
      </footer>
      <Link className="mobile-sell-button" to="/sell">
        <span aria-hidden="true">＋</span> 판매하기
      </Link>
    </div>
  );
}

export default App;
