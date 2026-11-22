import type { ChatRoomInfo, Message } from "../types/chat"
import type { AuthUser } from "./auth"
import type { Product } from "../data/products"

const LOCAL_CHATS_KEY = "reown-local-chats"

export type LocalChatData = {
  room: ChatRoomInfo
  messages: Message[]
  buyer?: {
    id: string
    nickname: string
  }
}

const getLocalChats = (): Record<string, LocalChatData> => {
  try {
    const stored = window.localStorage.getItem(LOCAL_CHATS_KEY)
    return stored ? (JSON.parse(stored) as Record<string, LocalChatData>) : {}
  } catch {
    return {}
  }
}

const saveLocalChats = (chats: Record<string, LocalChatData>) => {
  window.localStorage.setItem(LOCAL_CHATS_KEY, JSON.stringify(chats))
}

export const isLocalChatRoom = (roomId: string) => roomId.startsWith("local-")

export const createLocalChatRoom = (
  product: Product,
  currentUser: AuthUser,
): string => {
  const roomId = `local-${product.id}-${currentUser.id}`
  const chats = getLocalChats()

  if (!chats[roomId]) {
    chats[roomId] = {
      room: {
        id: roomId,
        myId: currentUser.id,
        product: {
          id: String(product.id),
          title: product.title,
          price: product.price,
          image: product.image || null,
          status: product.soldOut ? "SOLD" : "ON_SALE",
          deleted: !!product.deletedAt,
        },
        partner: {
          id: String(product.sellerId ?? ""),
          nickname: product.sellerName || "판매자",
        },
        blocked: false,
      },
      messages: [],
      buyer: {
        id: currentUser.id,
        nickname: currentUser.nickname,
      },
    }
    saveLocalChats(chats)
  }

  return roomId
}

export const getLocalChatRoom = (
  roomId: string,
  currentUserId?: string,
  currentUserNickname?: string,
): LocalChatData | null => {
  const chat = getLocalChats()[roomId]
  if (!chat) return null

  if (
    currentUserId &&
    (chat.room.partner.id === currentUserId ||
      chat.room.partner.nickname === currentUserNickname)
  ) {
    return {
      ...chat,
      room: {
        ...chat.room,
        myId: currentUserId,
        partner: {
          id: chat.buyer?.id ?? "",
          nickname: chat.buyer?.nickname ?? "구매자",
        },
      },
    }
  }

  return chat
}

export const getLocalChatRooms = (
  currentUserId: string,
  currentUserNickname: string,
): LocalChatData[] =>
  Object.values(getLocalChats()).filter(({ room, buyer }) => {
    if (room.myId === currentUserId) return true
    if (room.partner.id === currentUserId) return true
    if (room.partner.nickname === currentUserNickname) return true
    return buyer?.id === currentUserId
  })

export const addLocalChatMessage = (
  roomId: string,
  senderId: string,
  content: string,
): Message | null => {
  const chats = getLocalChats()
  const chat = chats[roomId]
  if (!chat) return null

  const message: Message = {
    id: `local-message-${Date.now()}`,
    chatRoomId: roomId,
    senderId,
    content: content.trim(),
    readAt: null,
    createdAt: new Date().toISOString(),
  }
  chat.messages = [...chat.messages, message]
  saveLocalChats(chats)
  return message
}
