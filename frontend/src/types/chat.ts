export type ProductStatus = "ON_SALE" | "RESERVED" | "SOLD"

export interface Message {
  id: string
  chatRoomId: string
  senderId: string
  content: string
  readAt: string | null
  createdAt: string
}

export interface ChatRoomInfo {
  id: string
  myId: string
  product: {
    id: string
    title: string
    price: number
    image: string | null
    status: ProductStatus
    deleted: boolean
  }
  partner: {
    id: string
    nickname: string
  }
  blocked: boolean
}

export type SocketAck<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; code?: string; message: string }
