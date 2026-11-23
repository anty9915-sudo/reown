import type { ReactNode } from "react"

type ProductResultsProps = {
  loading: boolean
  loadingMore: boolean
  error: string
  hasNext: boolean
  products: readonly unknown[]
  retry: () => void
  loadMore: () => Promise<void>
  children: ReactNode
}

export default function ProductResults({
  loading, loadingMore, error, hasNext, products, retry, loadMore, children,
}: ProductResultsProps) {
  if (loading) {
    return <div className="empty-state" role="status">상품을 불러오는 중이에요...</div>
  }
  if (error && products.length === 0) {
    return (
      <div className="empty-state" role="alert">
        <strong>상품을 불러오지 못했어요</strong>
        <p>{error}</p>
        <button type="button" onClick={retry}>다시 시도</button>
      </div>
    )
  }
  return (
    <>
      {children}
      {error && <p className="product-list-error" role="alert">{error}</p>}
      {hasNext && (
        <button
          className="more-button"
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "상품을 불러오는 중..." : error ? "다음 상품 다시 불러오기" : "상품 더 보기"}
        </button>
      )}
    </>
  )
}
