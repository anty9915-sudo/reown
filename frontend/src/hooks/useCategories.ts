import { useCallback, useEffect, useState } from "react"
import { fetchCategories, type Category } from "../api/categories"

type CategoryState = {
  categories: Category[]
  loading: boolean
  error: string
}

const initialState: CategoryState = { categories: [], loading: true, error: "" }

export function useCategories() {
  const [state, setState] = useState<CategoryState>(initialState)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchCategories(controller.signal)
      .then((categories) => {
        if (controller.signal.aborted) return
        setState({ categories, loading: false, error: "" })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          categories: [], loading: false,
          error: error instanceof Error ? error.message : "카테고리를 불러오지 못했어요.",
        })
      })
    return () => controller.abort()
  }, [version])

  const retry = useCallback(() => {
    setState(initialState)
    setVersion((current) => current + 1)
  }, [])

  return { ...state, retry }
}
