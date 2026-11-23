import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../api/client"
import {
  fetchProduct,
  fetchProducts,
  toProductCard,
  type ProductCard,
  type ProductDetail,
} from "../api/products"

interface ListState {
  products: ProductCard[]
  cursor: string | null
  hasNext: boolean
  loading: boolean
  loadingMore: boolean
  error: string
}

const initialListState: ListState = {
  products: [],
  cursor: null,
  hasNext: false,
  loading: true,
  loadingMore: false,
  error: "",
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "상품을 불러오지 못했어요."

export function useProducts() {
  const [state, setState] = useState<ListState>(initialListState)
  const [version, setVersion] = useState(0)
  const moreRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(undefined, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setState({
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
        setState({ ...initialListState, loading: false, error: errorMessage(error) })
      })

    return () => {
      controller.abort()
      moreRequest.current?.abort()
      moreRequest.current = null
    }
  }, [version])

  const retry = useCallback(() => {
    moreRequest.current?.abort()
    moreRequest.current = null
    setState(initialListState)
    setVersion((current) => current + 1)
  }, [])

  const loadMore = async () => {
    if (state.loading || !state.hasNext || !state.cursor || moreRequest.current) return
    const controller = new AbortController()
    moreRequest.current = controller
    setState((current) => ({ ...current, loadingMore: true, error: "" }))
    try {
      const result = await fetchProducts(state.cursor, controller.signal)
      if (controller.signal.aborted) return
      setState((current) => {
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
        setState((current) => ({ ...current, loadingMore: false, error: errorMessage(error) }))
      }
    } finally {
      if (moreRequest.current === controller) moreRequest.current = null
    }
  }

  return { ...state, retry, loadMore }
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
