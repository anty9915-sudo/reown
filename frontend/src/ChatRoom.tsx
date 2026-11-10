import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { Link, useParams } from "react-router-dom"
import SiteHeader from "./components/SiteHeader"
import { MAX_LENGTH, isValidContent, useChatRoom } from "./hooks/useChatRoom"
import { formatPrice } from "./utils/formatprice"
import { imageUrl } from "./utils/imageUrl"
import type { Message, ProductStatus } from "./types/chat"
import "./ChatRoom.css"

const STATUS_LABEL: Record<ProductStatus, string> = {
  ON_SALE: "판매중",
  RESERVED: "예약중",
  SOLD: "거래완료",
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  })

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

const isSameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString()

function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const {
    room,
    myId,
    messages,
    loading,
    loadError,
    sendError,
    connected,
    send,
  } = useChatRoom(roomId ?? "")

  const [search, setSearch] = useState("")
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const deleted = room?.product.deleted ?? false
  const blocked = room?.blocked ?? false
  const readOnly = deleted || blocked

  const canOffer = room?.product.status === "ON_SALE" && !readOnly

  const invalid = !isValidContent(text)
  const canSubmit = !readOnly && !invalid && !sending && connected

  const submit = async () => {
    if (!canSubmit) return
    setSending(true)
    const ok = await send(text)
    setSending(false)
    if (ok) setText("")
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  // Enter 전송, Shift+Enter 줄바꿈. 한글 조합 중 Enter는 무시
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const renderMessage = (m: Message, i: number) => {
    const prev = messages[i - 1]
    const mine = m.senderId === myId
    return (
      <li key={m.id} className="chat-row">
        {(!prev || !isSameDay(prev.createdAt, m.createdAt)) && (
          <div className="chat-date">{formatDate(m.createdAt)}</div>
        )}
        <div className={`chat-message ${mine ? "mine" : "theirs"}`}>
          <div className="chat-bubble">{m.content}</div>
          <div className="chat-meta">
            {mine && <span>{m.readAt ? "읽음" : "전송됨"}</span>}
            <span>{formatTime(m.createdAt)}</span>
          </div>
        </div>
      </li>
    )
  }

  let body
  if (loading) {
    body = <p className="chat-state">불러오는 중...</p>
  } else if (loadError || !room) {
    body = (
      <div className="chat-state">
        <p>
          {loadError?.status === 403
            ? "이 채팅방에 접근할 수 없어요."
            : loadError?.status === 404
              ? "채팅방을 찾을 수 없어요."
              : (loadError?.message ?? "채팅방을 불러오지 못했어요.")}
        </p>
        <Link to="/market">상품 둘러보기</Link>
      </div>
    )
  } else {
    body = (
      <section className="chat-room">
        <header className="chat-header">
          <div className="chat-partner">
            <strong>{room.partner.nickname}</strong>
            {!connected && <span className="chat-offline">연결 중...</span>}
          </div>
        </header>

        {/* 상품 정보 + D21 상태 태그 + 가격 제안 버튼 */}
        <div className="chat-product">
          <Link
            to={`/products/${room.product.id}`}
            className="chat-product-link"
          >
            {room.product.image && (
              <img src={imageUrl(room.product.image)} alt="" />
            )}
            <div className="chat-product-info">
              <span
                className={`chat-status chat-status-${room.product.status.toLowerCase()}`}
              >
                {STATUS_LABEL[room.product.status]}
              </span>
              <strong>{room.product.title}</strong>
              <span>{formatPrice(room.product.price)}</span>
            </div>
          </Link>
          <button
            className="chat-offer-btn"
            type="button"
            disabled={!canOffer}
            title={canOffer ? "" : "판매중인 상품에만 가격을 제안할 수 있어요"}
          >
            가격 제안
          </button>
        </div>

        {deleted && (
          <p className="chat-notice">
            삭제된 상품의 채팅방입니다. 메시지 읽기만 가능합니다.
          </p>
        )}
        {!deleted && blocked && (
          <p className="chat-notice">차단 관계라 메시지를 보낼 수 없어요.</p>
        )}

        <ul className="chat-messages">
          {messages.length === 0 && (
            <li className="chat-empty">첫 메시지를 보내보세요.</li>
          )}
          {messages.map(renderMessage)}
          <div ref={bottomRef} />
        </ul>

        {sendError && (
          <p className="chat-error" role="alert">
            {sendError}
          </p>
        )}

        <form className="chat-form" onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={readOnly}
            rows={1}
            placeholder={
              readOnly
                ? "메시지를 보낼 수 없는 채팅방입니다."
                : "메시지를 입력하세요"
            }
          />
          <span
            className={
              text.length > MAX_LENGTH ? "chat-count over" : "chat-count"
            }
          >
            {text.length}/{MAX_LENGTH}
          </span>
          <button type="submit" disabled={!canSubmit}>
            전송
          </button>
        </form>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />
      <main className="chat-main">
        <Link className="chat-back" to="/market">
          <span aria-hidden="true">←</span> 상품 목록으로
        </Link>
        {body}
      </main>
    </div>
  )
}

export default ChatRoom
