import { useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import { imageUrl } from "./utils/imageUrl";
import SiteHeader from "./components/SiteHeader";
import { formatPrice } from "./utils/formatprice";
import { useCart } from "./hooks/cartContext";
import { useProductSearch } from "./hooks/useProductSearch";
import ProductResults from "./components/ProductResults";
import ProductFilters from "./components/ProductFilters";
import RegionSelector from "./components/RegionSelector";

function App() {
  const searchState = useProductSearch();
  const {
    search, setSearch, selectedCategory, setSelectedCategory,
    selectedRegion, selectRegion, resetRegion, resetFilters, productList,
  } = searchState;
  const [favorites, setFavorites] = useState<string[]>([]);
  const { cart, toggleCart } = useCart();
  const visibleProducts = productList.products;
  const featuredProduct = visibleProducts[0];

  const toggleFavorite = (id: string) => {
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
                {featuredProduct.image ? (
                  <img
                    src={imageUrl(featuredProduct.image)}
                    alt={featuredProduct.title}
                  />
                ) : (
                  <div className="product-image-placeholder" role="img" aria-label="상품 사진 없음" />
                )}
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
            <div aria-hidden="true" className="hero-sparkle sparkle-one">
              ✳
            </div>
            <div aria-hidden="true" className="hero-sparkle sparkle-two">
              ✦
            </div>
          </div>
          <div className="hero-location-selector">
            <RegionSelector
              selectedRegion={selectedRegion.name}
              onSelect={selectRegion}
              onReset={resetRegion}
              allowFallback={false}
            />
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
          <ProductFilters {...searchState} />
          <ProductResults {...productList}>
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
                      {product.image ? (
                        <img
                          src={imageUrl(product.image)}
                          alt={product.title}
                        />
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
                    <h3>{product.title}</h3>
                    <div className="product-price-row">
                      <strong className="product-price">
                        {formatPrice(product.price)}
                      </strong>
                      <button
                        aria-label={
                          cart.some(
                            (item) => item.productId === String(product.id),
                          )
                            ? `${product.title} 장바구니에서 빼기`
                            : `${product.title} 장바구니에 담기`
                        }
                        aria-pressed={cart.some(
                          (item) => item.productId === String(product.id),
                        )}
                        className={`cart-button ${
                          cart.some(
                            (item) => item.productId === String(product.id),
                          )
                            ? "is-in-cart"
                            : ""
                        }`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleCart(product);
                        }}
                        type="button"
                      >
                        {cart.some(
                          (item) => item.productId === String(product.id),
                        )
                          ? "✓ 담김"
                          : "+ 장바구니"}
                      </button>
                    </div>
                    <div className="product-meta">
                      <span>
                        {product.location} · {product.time}
                      </span>
                      <span className="product-likes">
                        <span aria-hidden="true">♡</span>{" "}
                        {product.likes + Number(favorites.includes(product.id))}
                      </span>
                    </div>
                    {product.sellerName && (
                      <span className="product-seller">
                        판매자 · {product.sellerName}
                      </span>
                    )}
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
                onClick={resetFilters}
              >
                전체 매물 보기
              </button>
            </div>
          )}
          </ProductResults>
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
