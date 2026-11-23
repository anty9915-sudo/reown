import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import SiteHeader from "./components/SiteHeader"
import { ApiError, createChatRoom } from "./api/chats"
import { toProductCard } from "./api/products"
import { useProduct } from "./hooks/useProducts"
import { formatPrice } from "./utils/formatprice"
import { imageUrl } from "./utils/imageUrl"
import { getAccessToken, getAuthUser } from "./lib/auth"
import "./ProductDetail.css"

function ProductDetailPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [starting, setStarting] = useState(false)
  const [chatError, setChatError] = useState("")
  const { product: detail, loading, error, notFound, retry } = useProduct(productId ?? "")
  const product = detail
    ? {
        ...toProductCard({
          ...detail,
          thumbnailUrl: [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null,
        }),
        description: detail.description,
        sellerName: detail.seller.nickname,
      }
    : null
  const currentUser = getAccessToken() ? getAuthUser() : null
  const isOwner =
    !!detail &&
    !!currentUser &&
    detail.seller.id === currentUser.id

  const startChat = async () => {
    if (!product || starting) return
    if (!currentUser) {
      navigate("/login", { state: { from: `/products/${product.id}` } })
      return
    }
    setStarting(true)
    setChatError("")
    try {
      const { roomId } = await createChatRoom(product.id)
      navigate(`/chats/${roomId}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        navigate("/login")
        return
      }
      setChatError(e instanceof Error ? e.message : "채팅을 시작할 수 없어요.")
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />
      {loading ? (
        <main className="product-detail-main">
          <section className="product-detail-not-found" role="status">
            <h1>상품을 불러오는 중이에요...</h1>
          </section>
        </main>
      ) : product ? (
        <main className="product-detail-main">
          <Link className="product-detail-back" to="/market">
            <span aria-hidden="true">←</span> 상품 목록으로
          </Link>

          <article className="product-detail">
            <div className="product-detail-image">
              {product.image ? (
                <img src={imageUrl(product.image)} alt={product.title} />
              ) : (
                <div
                  className="product-detail-image-placeholder"
                  role="img"
                  aria-label="상품 사진 없음"
                />
              )}
              {product.soldOut && (
                <span className="product-detail-sold-badge">거래완료</span>
              )}
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
                <span>조회 {detail?.viewCount ?? 0}회</span>
                <span aria-label={`관심 ${product.likes}개`}>
                  <span aria-hidden="true">♡</span> 관심 {product.likes}
                </span>
              </div>
              <strong className="product-detail-price">
                {formatPrice(product.price)}
              </strong>

              <div className="product-detail-divider" />
              {product.sellerName && (
                <div className="product-detail-seller">
                  <span>{product.sellerName.slice(0, 1)}</span>
                  <div>
                    <strong>판매자</strong>
                    <span>{product.sellerName}</span>
                  </div>
                </div>
              )}
              <section aria-labelledby="product-description-title">
                <h2 id="product-description-title">상품 설명</h2>
                <p>
                  {product.description?.trim() ||
                    "등록된 상품 정보를 확인해 주세요. 상품의 자세한 상태와 거래 조건은 판매자에게 문의해 주세요."}
                </p>
              </section>

              <div className="product-detail-location">
                <span aria-hidden="true">⌖</span>
                <div>
                  <strong>거래 지역</strong>
                  <span>{product.location}</span>
                </div>
              </div>

              {isOwner ? (
                <div className="product-owner-actions">
                  <button
                    className={`product-soldout-button${product.soldOut ? " is-soldout" : ""}`}
                    disabled
                    type="button"
                  >
                    거래 상태 변경 준비 중
                  </button>
                  <button
                    className="product-delete-button"
                    disabled
                    type="button"
                  >
                    상품 삭제 연결 준비 중
                  </button>
                </div>
              ) : (
                <button
                  className="product-detail-contact"
                  onClick={startChat}
                  disabled={starting || product.soldOut}
                  type="button"
                >
                  {product.soldOut
                    ? "품절된 상품이에요"
                    : starting
                      ? "채팅방 여는 중..."
                      : "판매자에게 문의하기"}
                </button>
              )}
              {chatError && (
                <p className="product-detail-note" role="alert">
                  {chatError}
                </p>
              )}
            </div>
          </article>

          <section className="product-detail-safety">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>안전한 거래를 위해</strong>
              <p>
                거래 전 상품 상태와 약속 내용을 판매자와 충분히 확인해 주세요.
              </p>
            </div>
            <Link to="/safedeal">
              안전거래 안내 <span aria-hidden="true">→</span>
            </Link>
          </section>
        </main>
      ) : (
        <main className="product-detail-main">
          <section className="product-detail-not-found" role={notFound ? "status" : "alert"}>
            <span aria-hidden="true">⌕</span>
            <h1>{notFound ? "상품을 찾을 수 없어요" : "상품을 불러오지 못했어요"}</h1>
            <p>{notFound ? "상품이 삭제되었거나 주소가 올바르지 않습니다." : error}</p>
            {!notFound && <button type="button" onClick={retry}>다시 시도</button>}
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
