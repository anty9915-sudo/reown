import { apiRequest, ApiError } from "./client"

export interface Category {
  id: string
  name: string
}

// 서버의 정렬 순서와 bigint ID 문자열을 그대로 사용한다.
export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  const result = await apiRequest<{ items: Category[] }>("/api/v1/categories", { signal })
  if (!Array.isArray(result.items) || result.items.some((category) =>
    !category || typeof category.id !== "string" || !/^[1-9]\d*$/.test(category.id) ||
    typeof category.name !== "string" || !category.name.trim(),
  )) {
    throw new ApiError("카테고리 목록 응답이 올바르지 않아요.", 502)
  }
  return result.items
}
