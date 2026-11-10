import { apiRequest } from "./client"
import type { ProductStatus } from "../types/chat"

export type TransactionStatus = "RESERVED" | "COMPLETED" | "CANCELED"

export interface BuyerTransaction {
  id: string
  createdAt: string
  status: TransactionStatus
  finalPrice: number
  product: {
    id: string
    title: string
    image: string | null
    status: ProductStatus
  }
  seller: {
    nickname: string
  }
}

export const fetchBuyerTransactions = async (signal?: AbortSignal) => {
  const result = await apiRequest<{ items: BuyerTransaction[] }>(
    "/api/v1/transactions?role=buyer",
    { signal },
  )
  return result.items
}
