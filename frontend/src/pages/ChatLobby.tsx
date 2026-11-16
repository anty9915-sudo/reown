import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import SiteHeader from "../components/SiteHeader"
import { ApiError, fetchChatRooms, getToken, type ChatListItem } from "../api/chats"
import "../styles/ChatLobby.css"

const formatMessageTime = (iso: string | null) => {
  if (!iso) return ""
  const date = new Date(iso)
  const today = new Date()
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  return sameDay
    ? date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
}

function ChatLobby() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getToken()))
  const [rooms, setRooms] = useState<ChatListItem[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(() => Boolean(getToken()))
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    // TODO: 로그인 없이 로비 UI를 미리 볼 수 있도록 임시로 인증 진입을 허용한다.
    // 실제 대화 목록 API와 채팅방은 백엔드 인증을 계속 적용한다.
    if (!getToken()) {
      return
    }

    let active = true
    const loadRooms = async () => {
      setLoading(true)
      setError("")
      try {
        const items = await fetchChatRooms()
        if (active) setRooms(items)
      } catch (cause) {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 401) {
          setIsLoggedIn(false)
          setError("로그인 후 내 채팅 목록을 불러올 수 있어요.")
          return
        }
        setError(
          cause instanceof Error
            ? cause.message
            : "채팅 목록을 불러오지 못했어요.",
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRooms()
    return () => {
      active = false
    }
  }, [retry])

  const filteredRooms = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase()
    if (!keyword) return rooms
    return rooms.filter((room) =>
      `${room.partner.nickname} ${room.productTitle} ${room.lastMessage ?? ""}`
        .toLocaleLowerCase()
        .includes(keyword),
    )
  }, [rooms, search])

  return (
    <div className="app-shell">
      <SiteHeader search="" onSearchChange={() => undefined} />
      <main className="chat-lobby">
        <div className="chat-lobby-heading">
          <div>
            <p className="chat-lobby-eyebrow">REOWN MESSAGE</p>
            <h1>채팅</h1>
            <p className="chat-lobby-description">
              이웃과 나눈 대화를 확인해 보세요.
            </p>
          </div>
          <Link className="chat-lobby-market-link" to="/market">
            상품 둘러보기 <span aria-hidden="true">→</span>
          </Link>
        </div>

        <label className="chat-lobby-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="상대방이나 상품명으로 검색"
            aria-label="채팅 검색"
          />
        </label>

        <section className="chat-lobby-list" aria-label="채팅 목록">
          {loading ? (
            <p className="chat-lobby-state" role="status">
              채팅 목록을 불러오는 중...
            </p>
          ) : error ? (
            <div className="chat-lobby-state" role="alert">
              <p>{error}</p>
              {isLoggedIn ? (
                <button type="button" onClick={() => setRetry((value) => value + 1)}>
                  다시 시도
                </button>
              ) : (
                <Link to="/login" state={{ from: "/chats" }}>
                  로그인
                </Link>
              )}
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="chat-lobby-empty">
              <span className="chat-lobby-empty-icon" aria-hidden="true">
                ☁
              </span>
              <strong>
                {!isLoggedIn
                  ? "채팅 미리보기"
                  : rooms.length === 0
                    ? "아직 대화가 없어요"
                    : "검색 결과가 없어요"}
              </strong>
              <p>
                {!isLoggedIn
                  ? "로비 화면은 볼 수 있지만 실제 채팅 목록과 메시지는 로그인 후 이용할 수 있어요."
                  : rooms.length === 0
                    ? "관심 있는 상품의 판매자에게 먼저 문의해 보세요."
                    : "다른 검색어를 입력해 보세요."}
              </p>
              {!isLoggedIn ? (
                <Link to="/login" state={{ from: "/chats" }}>
                  로그인
                </Link>
              ) : rooms.length === 0 ? (
                <Link to="/market">상품 둘러보기</Link>
              ) : null}
            </div>
          ) : (
            filteredRooms.map((room) => (
              <Link
                className="chat-lobby-item"
                key={room.id}
                to={`/chats/${encodeURIComponent(room.id)}`}
              >
                <span className="chat-lobby-avatar" aria-hidden="true">
                  {room.partner.nickname.slice(0, 1)}
                </span>
                <span className="chat-lobby-item-main">
                  <span className="chat-lobby-item-top">
                    <strong>{room.partner.nickname}</strong>
                    <time dateTime={room.lastMessageAt ?? undefined}>
                      {formatMessageTime(room.lastMessageAt)}
                    </time>
                  </span>
                  <span className="chat-lobby-product">{room.productTitle}</span>
                  <span className="chat-lobby-preview">
                    {room.blocked
                      ? "차단된 사용자와의 대화"
                      : room.lastMessage ?? "대화를 시작해 보세요."}
                  </span>
                </span>
                {room.unreadCount > 0 && (
                  <span className="chat-lobby-unread" aria-label={`읽지 않은 메시지 ${room.unreadCount}개`}>
                    {room.unreadCount > 99 ? "99+" : room.unreadCount}
                  </span>
                )}
              </Link>
            ))
          )}
        </section>
      </main>
    </div>
  )
}

export default ChatLobby
