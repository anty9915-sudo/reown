import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Notice.css'

const notices = [
  {
    id: 'service-guide',
    category: '안내',
    title: 'REOWN 서비스 이용 안내',
    date: '2026.11.09',
    pinned: true,
    content:
      'REOWN은 가까운 이웃과 중고 물품을 나누는 서비스입니다. 상품 정보와 거래 조건을 충분히 확인하고, 거래 약속은 채팅으로 미리 정리해 주세요. 서비스 이용 중 불편한 점이나 문의 사항은 운영팀에 알려주세요.',
  },
  {
    id: 'safe-trading',
    category: '안전거래',
    title: '안전한 거래를 위한 이용 수칙',
    date: '2026.10.28',
    pinned: false,
    content:
      '상품 상태와 사진을 꼼꼼히 확인하고, 의심스러운 링크나 외부 송금 요청에는 응하지 마세요. 직접 만나는 거래라면 사람이 많은 장소를 선택하고, 거래가 끝날 때까지 대화 내용을 보관해 주세요.',
  },
  {
    id: 'notice-board',
    category: '서비스',
    title: 'REOWN 공지사항 게시판을 안내합니다',
    date: '2026.10.20',
    pinned: false,
    content:
      '서비스의 주요 소식과 이용 안내를 이 게시판에서 확인하실 수 있습니다. 새로운 공지사항이 등록되면 이 페이지에 안내해 드릴게요.',
  },
]

function NoticePage() {
  const [expandedNotice, setExpandedNotice] = useState<string | null>(
    notices[0].id,
  )

  return (
    <div className="notice-page">
      <header className="notice-header">
        <Link aria-label="REOWN 홈" className="brand" to="/">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <nav aria-label="공지사항 메뉴" className="notice-nav">
          <Link to="/market">중고거래</Link>
          <Link className="notice-home-link" to="/">홈으로</Link>
        </nav>
      </header>

      <main className="notice-main">
        <section aria-labelledby="notice-title" className="notice-heading">
          <span className="notice-eyebrow">REOWN COMMUNITY</span>
          <h1 id="notice-title">공지사항</h1>
          <p>REOWN의 새로운 소식과 꼭 필요한 안내를 확인해 보세요.</p>
        </section>

        <section aria-label="공지사항 목록" className="notice-list">
          <div className="notice-list-heading">
            <h2>전체 공지</h2>
            <span>{notices.length}개의 소식</span>
          </div>
          {notices.map((notice) => {
            const isExpanded = expandedNotice === notice.id
            return (
              <article
                className={`notice-item${isExpanded ? ' is-expanded' : ''}`}
                key={notice.id}
              >
                <button
                  aria-controls={`notice-content-${notice.id}`}
                  aria-expanded={isExpanded}
                  className="notice-item-button"
                  onClick={() =>
                    setExpandedNotice(isExpanded ? null : notice.id)
                  }
                  type="button"
                >
                  <span className="notice-item-leading">
                    {notice.pinned && (
                      <span className="notice-pin">중요</span>
                    )}
                    <span className="notice-category">{notice.category}</span>
                  </span>
                  <span className="notice-item-title">{notice.title}</span>
                  <time className="notice-date" dateTime={notice.date.replaceAll('.', '-')}>
                    {notice.date}
                  </time>
                  <span aria-hidden="true" className="notice-chevron">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>
                {isExpanded && (
                  <div
                    className="notice-content"
                    id={`notice-content-${notice.id}`}
                  >
                    <p>{notice.content}</p>
                  </div>
                )}
              </article>
            )
          })}
        </section>

        <div className="notice-back">
          <Link to="/">메인으로 돌아가기 <span aria-hidden="true">→</span></Link>
        </div>
      </main>

      <footer className="notice-footer">
        <span>reown</span>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <small>© 2026 reown. All rights reserved.</small>
      </footer>
    </div>
  )
}

export default NoticePage