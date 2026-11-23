import type { Category } from "../api/categories"
import "./CategoryFilters.css"

type CategoryFeedbackProps = {
  categories: readonly Category[]
  loading: boolean
  error: string
  retry: () => void
}

export function CategoryFeedback({ categories, loading, error, retry }: CategoryFeedbackProps) {
  if (loading) {
    return <p className="category-feedback" role="status">카테고리를 불러오는 중이에요...</p>
  }
  if (error) {
    return (
      <div className="category-feedback category-feedback-error" role="alert">
        <p>카테고리를 불러오지 못했어요. {error}</p>
        <button type="button" onClick={retry}>카테고리 다시 불러오기</button>
      </div>
    )
  }
  return categories.length === 0
    ? <p className="category-feedback" role="status">등록된 카테고리가 없습니다.</p>
    : null
}

const categoryIcons: Record<string, string> = {
  "디지털기기": "⌁",
  "가구·인테리어": "⌂",
  "패션의류": "♧",
  "생활가전": "◉",
  "취미·게임": "♬",
}

type CategoryFiltersProps = CategoryFeedbackProps & {
  selectedId: string
  onSelect: (id: string) => void
  variant?: "tiles" | "pills"
  label?: string
}

export default function CategoryFilters({
  selectedId, onSelect, variant = "pills", label = "카테고리", ...state
}: CategoryFiltersProps) {
  const tiles = variant === "tiles"
  const buttonClass = tiles ? "category-item" : "market-category"
  return (
    <>
      <div className={tiles ? "category-list" : "market-page-categories"} aria-label={label}>
        <button type="button" aria-pressed={selectedId === ""}
          className={`${buttonClass}${selectedId === "" ? " selected" : ""}`}
          onClick={() => onSelect("")}>
          {tiles && <span className="category-icon all-icon" aria-hidden="true">✳</span>}
          <span>{tiles ? "전체보기" : "전체"}</span>
        </button>
        {state.categories.map((category) => (
          <button key={category.id} type="button" aria-pressed={selectedId === category.id}
            className={`${buttonClass}${selectedId === category.id ? " selected" : ""}`}
            onClick={() => onSelect(category.id)}>
            {tiles && <span className="category-icon" aria-hidden="true">{categoryIcons[category.name] ?? "◇"}</span>}
            <span>{category.name}</span>
          </button>
        ))}
      </div>
      <CategoryFeedback {...state} />
    </>
  )
}
