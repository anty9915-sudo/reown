import { apiRequest, ApiError } from "./client"

export type ProductStatus = "ON_SALE" | "RESERVED" | "SOLD"

export interface ProductListItem {
  id: string
  title: string
  price: number
  status: ProductStatus
  viewCount: number
  favoriteCount: number
  thumbnailUrl: string | null
  category: { id: string; name: string }
  region: {
    id: string
    sido: string
    sigungu: string | null
    eupmyeondong: string
  }
  createdAt: string
}

export interface ProductImage {
  id: string
  url: string
  sortOrder: number
}

export interface ProductDetail extends Omit<ProductListItem, "thumbnailUrl"> {
  description: string
  images: ProductImage[]
  isFavorited: boolean
  seller: {
    id: string
    nickname: string
    reviewCount: number | null
    avgRating: number | null
    mannerTemperature: number | null
  }
  updatedAt: string
}

export interface ProductPage {
  items: ProductListItem[]
  pageInfo: { nextCursor: string | null; hasNext: boolean }
}

// DB의 bigint ID는 숫자로 바꾸지 않고 문자열 그대로 유지한다.
export const fetchProducts = (
  cursor?: string,
  signal?: AbortSignal,
): Promise<ProductPage> => {
  const query = new URLSearchParams({ limit: "20" })
  if (cursor) query.set("cursor", cursor)
  return apiRequest<ProductPage>(`/api/v1/products?${query}`, { signal })
}

export const fetchProduct = async (
  productId: string,
  signal?: AbortSignal,
): Promise<ProductDetail> => {
  if (!/^[1-9]\d*$/.test(productId)) {
    throw new ApiError("상품 주소가 올바르지 않아요.", 404)
  }
  const result = await apiRequest<{ product: ProductDetail }>(
    `/api/v1/products/${encodeURIComponent(productId)}`,
    { signal },
  )
  return result.product
}

export interface ProductCard {
  id: string
  title: string
  price: number
  category: string
  location: string
  time: string
  image: string
  likes: number
  status: ProductStatus
  soldOut: boolean
  badge?: string
  sellerName?: string
}

const formatCreatedAt = (createdAt: string): string => {
  const timestamp = Date.parse(createdAt)
  if (!Number.isFinite(timestamp)) return ""
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}시간 전`
  return `${Math.floor(minutes / 1_440)}일 전`
}

// 서버 응답을 기존 상품 카드 UI에 맞춘다. 예시·브라우저 상품은 섞지 않는다.
export const toProductCard = (product: ProductListItem): ProductCard => ({
  id: product.id,
  title: product.title,
  price: product.price,
  category: product.category.name,
  location: [product.region.sido, product.region.sigungu, product.region.eupmyeondong]
    .filter(Boolean)
    .join(" "),
  time: formatCreatedAt(product.createdAt),
  image: product.thumbnailUrl ?? "",
  likes: product.favoriteCount,
  status: product.status,
  soldOut: product.status === "SOLD",
  badge: product.status === "RESERVED" ? "예약중" : undefined,
})
