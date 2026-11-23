import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../api/client"
import {
  fetchProduct,
  fetchProducts,
  toProductCard,
  type ProductCard,
  type ProductDetail,
  type ProductListQuery,
} from "../api/products"

interface ListState {
  key: string
  products: ProductCard[]
  cursor: string | null
  hasNext: boolean
  loading: boolean
  loadingMore: boolean
  error: string
}

const initialListState: ListState = {
  key: "",
  products: [],
  cursor: null,
  hasNext: false,
  loading: true,
  loadingMore: false,
  error: "",
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "상품을 불러오지 못했어요."

export function useProducts(filters: ProductListQuery = {}) {
  const [state, setState] = useState<ListState>(initialListState)
  const [version, setVersion] = useState(0)
  const moreRequest = useRef<AbortController | null>(null)
  const filtersKey = JSON.stringify(filters)
  const requestKey = `${version}:${filtersKey}`
  // 검색 조건이 바뀌면 이전 결과를 숨기고, 다른 조건의 커서를 재사용하지 않는다.
  const currentState = state.key === requestKey ? state : initialListState

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(JSON.parse(filtersKey) as ProductListQuery, undefined, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setState({
          key: requestKey,
          products: result.items.map(toProductCard),
          cursor: result.pageInfo.nextCursor,
          hasNext: result.pageInfo.hasNext,
          loading: false,
          loadingMore: false,
          error: "",
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ ...initialListState, key: requestKey, loading: false, error: errorMessage(error) })
      })

    return () => {
      controller.abort()
      moreRequest.current?.abort()
      moreRequest.current = null
    }
  }, [filtersKey, requestKey])

  const retry = useCallback(() => {
    moreRequest.current?.abort()
    moreRequest.current = null
    setState(initialListState)
    setVersion((current) => current + 1)
  }, [])

  const loadMore = async () => {
    if (currentState.loading || !currentState.hasNext || !currentState.cursor || moreRequest.current) return
    const controller = new AbortController()
    moreRequest.current = controller
    setState((current) => ({ ...current, loadingMore: true, error: "" }))
    try {
      const result = await fetchProducts(
        JSON.parse(filtersKey) as ProductListQuery,
        currentState.cursor,
        controller.signal,
      )
      if (controller.signal.aborted) return
      setState((current) => {
        if (current.key !== requestKey) return current
        const knownIds = new Set(current.products.map((product) => product.id))
        return {
          ...current,
          products: [
            ...current.products,
            ...result.items.filter((product) => !knownIds.has(product.id)).map(toProductCard),
          ],
          cursor: result.pageInfo.nextCursor,
          hasNext: result.pageInfo.hasNext,
          loadingMore: false,
          error: "",
        }
      })
    } catch (error) {
      if (!controller.signal.aborted) {
        setState((current) => current.key === requestKey
          ? { ...current, loadingMore: false, error: errorMessage(error) }
          : current)
      }
    } finally {
      if (moreRequest.current === controller) moreRequest.current = null
    }
  }

  return {
    products: currentState.products,
    cursor: currentState.cursor,
    hasNext: currentState.hasNext,
    loading: currentState.loading,
    loadingMore: currentState.loadingMore,
    error: currentState.error,
    retry,
    loadMore,
  }
}

interface DetailState {
  id: string
  product: ProductDetail | null
  error: string
  notFound: boolean
}

export function useProduct(productId: string) {
  const [state, setState] = useState<DetailState | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchProduct(productId, controller.signal)
      .then((product) => {
        if (controller.signal.aborted) return
        setState({ id: productId, product, error: "", notFound: false })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({
          id: productId,
          product: null,
          error: errorMessage(error),
          notFound: error instanceof ApiError && error.status === 404,
        })
      })
    return () => controller.abort()
  }, [productId, version])

  const retry = () => {
    setState(null)
    setVersion((current) => current + 1)
  }
  const loading = !state || state.id !== productId
  return {
    product: loading ? null : state.product,
    loading,
    error: loading ? "" : state.error,
    notFound: loading ? false : state.notFound,
    retry,
  }
}
