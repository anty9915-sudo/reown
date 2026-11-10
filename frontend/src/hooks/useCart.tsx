import { useEffect, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  addCartItem,
  fetchCart,
  removeCartItem,
  type CartItem,
} from "../api/cart"
import { ApiError, getToken } from "../api/client"
import type { Product } from "../data/products"
import { imageUrl } from "../utils/imageUrl"
import { CartContext } from "./cartContext"

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  const [error, setError] = useState("")
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken()) return

    let cancelled = false
    fetchCart()
      .then((items) => {
        if (cancelled) return
        setCart(items)
        setError("")
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        if (cause instanceof ApiError && cause.status === 401) {
          setCart([])
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "장바구니를 불러오지 못했어요.",
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const requireLogin = () => {
    if (getToken()) return true
    navigate("/login")
    return false
  }

  const toggleCart = async (product: Product) => {
    if (!requireLogin()) return

    const id = String(product.id)
    const existingItem = cart.find((item) => item.productId === id)
    const wasInCart = Boolean(existingItem)
    setCart((current) =>
      wasInCart
        ? current.filter((item) => item.productId !== id)
        : [
            ...current,
            {
              productId: id,
              title: product.title,
              price: product.price,
              category: product.category,
              location: product.location,
              imageUrl: imageUrl(product.image),
            },
          ],
    )

    try {
      if (wasInCart) {
        await removeCartItem(id)
      } else {
        await addCartItem(id)
      }
      setError("")
    } catch (cause) {
      setCart((current) =>
        wasInCart
          ? current.some((item) => item.productId === id)
            ? current
            : existingItem
              ? [...current, existingItem]
              : current
          : current.filter((item) => item.productId !== id),
      )
      setError(
        cause instanceof ApiError
          ? cause.message
          : "장바구니를 변경하지 못했어요.",
      )
    }
  }

  const removeFromCart = async (productId: string) => {
    if (!requireLogin()) return

    const id = productId
    const existingItem = cart.find((item) => item.productId === id)
    setCart((current) => current.filter((item) => item.productId !== id))
    try {
      await removeCartItem(id)
      setError("")
    } catch (cause) {
      setCart((current) =>
        current.some((item) => item.productId === id) || !existingItem
          ? current
          : [...current, existingItem],
      )
      setError(
        cause instanceof Error
          ? cause.message
          : "장바구니에서 상품을 제거하지 못했어요.",
      )
    }
  }

  const clearError = () => setError("")

  return (
    <CartContext.Provider
      value={{ cart, loading, error, clearError, toggleCart, removeFromCart }}
    >
      {error && (
        <div className="cart-feedback" role="alert">
          <span>{error}</span>
          <button aria-label="알림 닫기" onClick={clearError} type="button">
            ×
          </button>
        </div>
      )}
      {children}
    </CartContext.Provider>
  )
}
