import { createContext, useContext } from "react"
import type { CartItem } from "../api/cart"

export type CartProduct = {
  id: string | number
  title: string
  price: number
  category: string
  location: string
  image: string
}

export type CartContextValue = {
  cart: CartItem[]
  loading: boolean
  error: string
  clearError: () => void
  toggleCart: (product: CartProduct) => Promise<void>
  removeFromCart: (productId: string) => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart는 CartProvider 안에서 사용해야 합니다.")
  }
  return context
}
