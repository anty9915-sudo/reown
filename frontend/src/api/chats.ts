import { apiRequest } from "./client"
import type { ChatRoomInfo, Message } from "../types/chat"

export { ApiError, getToken } from "./client"

export const createChatRoom = (productId: number) =>
  apiRequest<{ roomId: string }>("/api/v1/chats", {
    method: "POST",
    body: JSON.stringify({ productId: String(productId) }),
  })

export const fetchChatRoom = (roomId: string) =>
  apiRequest<ChatRoomInfo>(`/api/v1/chats/${encodeURIComponent(roomId)}`)

export const fetchMessages = async (roomId: string) => {
  const result = await apiRequest<{ items: Message[] }>(
    `/api/v1/chats/${encodeURIComponent(roomId)}/messages`,
  )
  return result.items
}
