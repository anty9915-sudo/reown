import type { ProductSort, ProductStatus } from "../api/products"
import "./ProductFilters.css"

type ProductFiltersProps = {
  sort: ProductSort
  setSort: (value: ProductSort) => void
  status: ProductStatus | ""
  setStatus: (value: ProductStatus | "") => void
  minPrice: string
  setMinPrice: (value: string) => void
  maxPrice: string
  setMaxPrice: (value: string) => void
  resetFilters: () => void
}

export default function ProductFilters({
  sort, setSort, status, setStatus, minPrice, setMinPrice, maxPrice, setMaxPrice, resetFilters,
}: ProductFiltersProps) {
  return (
    <div className="product-filters" aria-label="상품 검색 조건">
      <label>
        <span>정렬</span>
        <select aria-label="정렬" value={sort} onChange={(event) => setSort(event.target.value as ProductSort)}>
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
          <option value="priceAsc">낮은 가격순</option>
          <option value="priceDesc">높은 가격순</option>
          <option value="views">조회수순</option>
        </select>
      </label>
      <label>
        <span>거래 상태</span>
        <select aria-label="거래 상태" value={status} onChange={(event) => setStatus(event.target.value as ProductStatus | "")}>
          <option value="">전체 상태</option>
          <option value="ON_SALE">판매중</option>
          <option value="RESERVED">예약중</option>
          <option value="SOLD">거래완료</option>
        </select>
      </label>
      <label>
        <span>최소 가격</span>
        <input aria-label="최소 가격" type="number" min="1" max="1000000000" step="1" placeholder="제한 없음"
          value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
      </label>
      <label>
        <span>최대 가격</span>
        <input aria-label="최대 가격" type="number" min="1" max="1000000000" step="1" placeholder="제한 없음"
          value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
      </label>
      <button type="button" onClick={resetFilters}>조건 초기화</button>
    </div>
  )
}
