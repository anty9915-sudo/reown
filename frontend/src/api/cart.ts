import { apiRequest } from "./client"

export interface CartItem {
  productId: string
  title: string
  price: number
  category: string
  location: string
  imageUrl: string | null
}

export const fetchCart = async () => {
  const result = await apiRequest<{ items: CartItem[] }>("/api/v1/cart")
  return result.items
}

export const addCartItem = (productId: string) =>
  apiRequest<CartItem>("/api/v1/cart", {
    method: "POST",
    body: JSON.stringify({ productId }),
  })

export const removeCartItem = (productId: string) =>
  apiRequest<void>(`/api/v1/cart/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  })
