import { Link } from 'react-router-dom'
import './SafeDeal.css'

function SafeDealPage() {
  /*
  const accessTokenKey = 'reown-access-token'
  const isLoggedIn =
    window.localStorage.getItem(accessTokenKey) !== null ||
    window.sessionStorage.getItem(accessTokenKey) !== null

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: '/safedeal' }} />
  }
  */

  return (
    <main className="safe-deal-page">
      <header className="safe-deal-header">
        <Link className="brand" to="/" aria-label="REOWN 홈">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <nav aria-label="안전거래 메뉴" className="safe-deal-nav">
          <Link to="/market">중고거래</Link>
          <Link className="safe-deal-home" to="/">홈으로</Link>
        </nav>
      </header>
      <div className="safe-deal-main">
        <section aria-labelledby="safe-deal-title" className="safe-deal-hero">
          <div className="safe-deal-hero-copy">
            <span className="safe-deal-eyebrow">
              <span aria-hidden="true">✦</span> TRADE WITH PEACE OF MIND
            </span>
            <h1 id="safe-deal-title">
              처음 거래도
              <br />
              <span>마음 놓이도록.</span>
            </h1>
            <p>
              믿을 수 있는 거래를 위한 안전거래,
              <br />
              reown이 준비하고 있어요.
            </p>
            <Link className="safe-deal-cta" to="/market">
              상품 둘러보기 <span aria-hidden="true">→</span>
            </Link>
            <span className="safe-deal-coming-soon">
              <span aria-hidden="true" /> 안전거래 서비스 준비 중
            </span>
          </div>

          <div aria-hidden="true" className="safe-deal-visual">
            <div className="safe-deal-orbit safe-deal-orbit-one" />
            <div className="safe-deal-orbit safe-deal-orbit-two" />
            <div className="safe-deal-shield">
              <span className="safe-deal-shield-check">✓</span>
              <span>안심 거래</span>
            </div>
            <div className="safe-deal-float-card safe-deal-float-top">
              <span className="safe-deal-float-icon">♡</span>
              <span><strong>안전한 약속</strong><small>거래 내용을 확인해요</small></span>
            </div>
            <div className="safe-deal-float-card safe-deal-float-bottom">
              <span className="safe-deal-float-icon">⌖</span>
              <span><strong>가까운 이웃</strong><small>우리 동네에서 만나요</small></span>
            </div>
            <span className="safe-deal-sparkle safe-deal-sparkle-one">✦</span>
            <span className="safe-deal-sparkle safe-deal-sparkle-two">✳</span>
          </div>
        </section>

        <section aria-labelledby="safe-deal-steps-title" className="safe-deal-steps-section">
          <div className="safe-deal-section-heading">
            <span className="section-kicker">A BETTER WAY TO TRADE</span>
            <h2 id="safe-deal-steps-title">안전한 거래를 위한 세 가지 약속</h2>
            <p>거래 전부터 마무리까지, 기본을 꼼꼼히 확인해요.</p>
          </div>
          <div className="safe-deal-steps">
            <article className="safe-deal-step-card">
              <span className="safe-deal-step-number">01</span>
              <span aria-hidden="true" className="safe-deal-step-icon">⌕</span>
              <h3>상품 정보를 확인해요</h3>
              <p>사진과 설명, 판매자의 안내를 자세히 살펴보세요.</p>
            </article>
            <article className="safe-deal-step-card">
              <span className="safe-deal-step-number">02</span>
              <span aria-hidden="true" className="safe-deal-step-icon">✉</span>
              <h3>거래 내용을 약속해요</h3>
              <p>장소와 시간, 가격을 채팅으로 미리 정리해 두세요.</p>
            </article>
            <article className="safe-deal-step-card">
              <span className="safe-deal-step-number">03</span>
              <span aria-hidden="true" className="safe-deal-step-icon">✓</span>
              <h3>확인 후 거래를 마쳐요</h3>
              <p>상품을 확인하고 서로 동의한 뒤 거래를 완료하세요.</p>
            </article>
          </div>
        </section>

        <section aria-label="안전거래 안내" className="safe-deal-notice">
          <div className="safe-deal-notice-mark" aria-hidden="true">i</div>
          <div>
            <strong>안전거래 서비스는 현재 준비 중이에요</strong>
            <p>서비스가 정식으로 제공되기 전에는 거래 상대와 상품 정보를 충분히 확인해 주세요.</p>
          </div>
          <Link to="/market">매물 보기 <span aria-hidden="true">→</span></Link>
        </section>
      </div>
      <footer className="safe-deal-footer">
        <span>reown</span>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <small>© 2026 reown. All rights reserved.</small>
      </footer>
    </main>
  )
}

export default SafeDealPage
