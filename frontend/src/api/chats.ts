import { apiRequest } from "./client"
import type { ChatRoomInfo, Message } from "../types/chat"

export { ApiError, getToken } from "./client"

export interface ChatListItem {
  id: string
  productId: string
  productTitle: string
  partner: {
    id: string
    nickname: string
  }
  lastMessage: string | null
  lastSenderId: string | null
  lastMessageAt: string | null
  unreadCount: number
  blocked: boolean
}

export const fetchChatRooms = async () => {
  const result = await apiRequest<{ items: ChatListItem[] }>("/api/v1/chats")
  return result.items
}

export const createChatRoom = (productId: string | number) =>
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
