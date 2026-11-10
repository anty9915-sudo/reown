import { io, type Socket } from "socket.io-client"
import { getApiBaseUrl, getToken } from "../api/client"

export const CHAT_EVENTS = {
  join: "chat:join", // 보내기
  leave: "chat:leave", // 보내기
  send: "chat:send", // 보내기
  read: "chat:read", // 보내기: 읽음 처리 요청
  message: "chat:message", // 받기: 새 메시지
  readUpdated: "chat:read", // 받기: 상대가 읽음
} as const

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiBaseUrl() || window.location.origin, {
      auth: { token: getToken() },
    })
  }
  return socket
}

// 로그아웃할 때 호출하세요
export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
