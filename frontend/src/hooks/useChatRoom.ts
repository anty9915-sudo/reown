import { useCallback, useEffect, useState } from "react"
import { ApiError, fetchChatRoom, fetchMessages } from "../api/chats"
import { CHAT_EVENTS, getSocket } from "../lib/socket"
import type { ChatRoomInfo, Message, SocketAck } from "../types/chat"

export const MAX_LENGTH = 1000

export const isValidContent = (text: string) =>
  text.trim().length >= 1 && text.length <= MAX_LENGTH

export function useChatRoom(roomId: string) {
  const [room, setRoom] = useState<ChatRoomInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [sendError, setSendError] = useState("")
  const [connected, setConnected] = useState(false)

  const myId = room?.myId

  // 읽음 요청: 화면을 보고 있을 때만
  const requestRead = useCallback(() => {
    if (document.visibilityState !== "visible") return
    getSocket().emit(CHAT_EVENTS.read, { roomId })
  }, [roomId])

  useEffect(() => {
    let cancelled = false
    const socket = getSocket()

    // REST로 기록 불러오기 (재연결 때도 다시 호출해서 놓친 메시지를 채움)
    const load = async () => {
      try {
        const [info, msgs] = await Promise.all([
          fetchChatRoom(roomId),
          fetchMessages(roomId),
        ])
        if (cancelled) return
        setRoom(info)
        setMessages(msgs)
        setLoadError(null)
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof ApiError ? e : new ApiError("불러오지 못했어요.", 0),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()

    const join = () => {
      setConnected(true)
      // 방 입장 후 기록을 불러오고 읽음 처리
      socket.emit(CHAT_EVENTS.join, { roomId }, (ack?: SocketAck) => {
        if (ack && !ack.ok) {
          setLoadError(new ApiError(ack.message, 403, ack.code))
          return
        }
        load().then(requestRead)
      })
    }

    const onMessage = (msg: Message) => {
      if (msg.chatRoomId !== roomId) return
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      )
      requestRead()
    }

    // 상대가 내 메시지를 읽음
    const onRead = (p: {
      roomId: string
      readerId: string
      readAt?: string
    }) => {
      if (p.roomId !== roomId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId !== p.readerId && !m.readAt
            ? { ...m, readAt: p.readAt ?? new Date().toISOString() }
            : m,
        ),
      )
    }

    const onDisconnect = () => setConnected(false)

    socket.on("connect", join)
    socket.on("disconnect", onDisconnect)
    socket.on(CHAT_EVENTS.message, onMessage)
    socket.on(CHAT_EVENTS.readUpdated, onRead)
    document.addEventListener("visibilitychange", requestRead)

    if (socket.connected) join()

    return () => {
      cancelled = true
      socket.emit(CHAT_EVENTS.leave, { roomId })
      socket.off("connect", join)
      socket.off("disconnect", onDisconnect)
      socket.off(CHAT_EVENTS.message, onMessage)
      socket.off(CHAT_EVENTS.readUpdated, onRead)
      document.removeEventListener("visibilitychange", requestRead)
    }
  }, [roomId, requestRead])

  // 전송: 성공하면 true
  const send = useCallback(
    (content: string) =>
      new Promise<boolean>((resolve) => {
        setSendError("")
        getSocket().emit(
          CHAT_EVENTS.send,
          { roomId, content },
          (ack?: SocketAck<{ message?: Message }>) => {
            if (ack && !ack.ok) {
              setSendError(ack.message) // 차단, 삭제 상품, 속도 제한 등
              resolve(false)
              return
            }
            // 내 메시지는 서버 브로드캐스트로 들어오지만, 안 들어오는 경우를 대비
            if (ack && ack.ok && ack.message) {
              const msg = ack.message
              setMessages((prev) =>
                prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
              )
            }
            resolve(true)
          },
        )
      }),
    [roomId],
  )

  return {
    room,
    myId,
    messages,
    loading,
    loadError,
    sendError,
    connected,
    send,
  }
}
