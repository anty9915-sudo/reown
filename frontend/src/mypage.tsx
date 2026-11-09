import { useState } from "react";
import "./MyPage.css";

const profileMenus = [
  { id: "overview", label: "마이페이지", icon: "⌂" },
  { id: "trades", label: "거래 내역", icon: "⇄", count: "2" },
  { id: "favorites", label: "관심 목록", icon: "♡", count: "4" },
  { id: "reviews", label: "받은 후기", icon: "✳", count: "3" },
] as const;

const transactions = [
  {
    title: "무선 이어폰",
    detail: "판매 · 역삼동",
    date: "2026.11.08",
    status: "거래 완료",
    icon: "♫",
    tone: "mint",
  },
  {
    title: "원목 사이드 테이블",
    detail: "구매 · 논현동",
    date: "2026.11.02",
    status: "거래 완료",
    icon: "▤",
    tone: "peach",
  },
] as const;

const favoriteItems = [
  { title: "데일리 캔버스 토트백", price: "18,000원", location: "서울 강남구" },
  { title: "미니 블루투스 스피커", price: "32,000원", location: "서울 서초구" },
  {
    title: "빈티지 무드 테이블 조명",
    price: "25,000원",
    location: "서울 송파구",
  },
  { title: "원목 수납 선반", price: "40,000원", location: "서울 마포구" },
] as const;

const receivedReviews = [
  {
    name: "따뜻한 이웃",
    date: "2026.11.08",
    text: "응답도 빠르고 친절하게 안내해 주셨어요!",
    tag: "친절해요",
  },
  {
    name: "초록 동네",
    date: "2026.11.02",
    text: "약속 시간에 맞춰 와주시고 거래가 깔끔했어요.",
    tag: "시간 약속을 잘 지켜요",
  },
  {
    name: "오후의 산책",
    date: "2026.10.27",
    text: "좋은 물건 나눠주셔서 감사합니다 :)",
    tag: "상품 상태가 좋아요",
  },
] as const;

function MyPage() {
  const [activeMenu, setActiveMenu] = useState<string>("overview");

  const activeMenuLabel =
    profileMenus.find((menu) => menu.id === activeMenu)?.label ?? "마이페이지";

  return (
    <div className="mypage">
      <header className="mypage-header">
        <a aria-label="REOWN 홈" className="mypage-brand" href="/">
          <span className="mypage-brand-mark">r</span>
          <span>reown</span>
        </a>
        <div className="mypage-header-right">
          <span className="mypage-neighborhood">
            <span aria-hidden="true">⌖</span> 서울특별시 강남구
          </span>
          <button
            aria-label="알림"
            className="mypage-icon-button"
            type="button"
          >
            ♧
          </button>
          <button
            aria-label="프로필 메뉴"
            className="mypage-avatar-small"
            type="button"
          >
            이
          </button>
        </div>
      </header>

      <div className="mypage-layout">
        <aside aria-label="마이페이지 메뉴" className="mypage-sidebar">
          <div className="mypage-profile-mini">
            <div className="mypage-avatar">이</div>
            <div>
              <strong>이웃님</strong>
              <span>서울 강남구 · 이웃</span>
            </div>
          </div>
          <nav className="mypage-menu">
            {profileMenus.map((menu) => (
              <button
                aria-current={activeMenu === menu.id ? "page" : undefined}
                className={activeMenu === menu.id ? "active" : ""}
                key={menu.id}
                onClick={() => setActiveMenu(menu.id)}
                type="button"
              >
                <span aria-hidden="true" className="mypage-menu-icon">
                  {menu.icon}
                </span>
                <span>{menu.label}</span>
                {"count" in menu && (
                  <span className="mypage-menu-count">{menu.count}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="mypage-sidebar-bottom">
            <span className="mypage-help-icon" aria-hidden="true">
              ?
            </span>
            <div>
              <strong>도움이 필요하신가요?</strong>
              <span>자주 묻는 질문을 확인해 보세요.</span>
            </div>
            <span aria-hidden="true">→</span>
          </div>
        </aside>

        <main className="mypage-content">
          <div className="mypage-page-heading">
            <div>
              <span className="mypage-eyebrow">MY NEIGHBORHOOD LIFE</span>
              <h1>{activeMenuLabel}</h1>
              <p>이웃님과 REOWN의 소중한 기록을 모아봤어요.</p>
            </div>
            <button className="mypage-edit-button" type="button">
              <span aria-hidden="true">✎</span> 프로필 수정
            </button>
          </div>

          <section aria-label="내 프로필" className="mypage-welcome-card">
            <div className="mypage-welcome-copy">
              <span className="mypage-welcome-label">
                <span /> REOWN NEIGHBOR
              </span>
              <h2>이웃님, 반가워요!</h2>
              <p>오늘도 가까운 이웃과 기분 좋은 거래를 만들어 보세요.</p>
              <div className="mypage-badges">
                <span>⌖ 강남구 이웃</span>
                <span>✦ 따뜻한 거래를 이어가는 중</span>
              </div>
            </div>
            <div aria-hidden="true" className="mypage-welcome-art">
              <div className="mypage-art-orbit" />
              <div className="mypage-art-circle">r</div>
              <span className="mypage-art-sparkle">✳</span>
              <span className="mypage-art-leaf">✦</span>
            </div>
          </section>

          <section aria-label="활동 요약" className="mypage-stats">
            <article>
              <span className="mypage-stat-icon green">⇄</span>
              <div>
                <span>함께한 거래</span>
                <strong>
                  2<span>회</span>
                </strong>
              </div>
              <span className="mypage-stat-caption">차곡차곡 쌓이는 거래</span>
            </article>
            <article>
              <span className="mypage-stat-icon coral">♡</span>
              <div>
                <span>관심 목록</span>
                <strong>
                  4<span>개</span>
                </strong>
              </div>
              <span className="mypage-stat-caption">마음에 담아둔 물건</span>
            </article>
            <article>
              <span className="mypage-stat-icon yellow">✳</span>
              <div>
                <span>받은 후기</span>
                <strong>
                  3<span>개</span>
                </strong>
              </div>
              <span className="mypage-stat-caption">
                이웃이 남겨준 따뜻한 말
              </span>
            </article>
          </section>

          <section
            aria-labelledby="mypage-activity-title"
            className="mypage-activity"
          >
            <div className="mypage-section-heading">
              <div>
                <span className="mypage-eyebrow">YOUR ACTIVITY</span>
                <h2 id="mypage-activity-title">
                  {activeMenu === "trades"
                    ? "거래 내역"
                    : activeMenu === "favorites"
                      ? "관심 목록"
                      : activeMenu === "reviews"
                        ? "받은 후기"
                        : "최근 활동"}
                </h2>
              </div>
              <button
                className="mypage-view-all"
                onClick={() =>
                  setActiveMenu(
                    activeMenu === "overview" ? "trades" : "overview",
                  )
                }
                type="button"
              >
                {activeMenu === "overview" ? "모두 보기" : "요약 보기"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {(activeMenu === "overview" || activeMenu === "trades") && (
              <div className="mypage-transaction-list">
                {transactions.map((transaction) => (
                  <article
                    className="mypage-transaction"
                    key={transaction.title}
                  >
                    <div
                      className={`mypage-product-icon ${transaction.tone}`}
                      aria-hidden="true"
                    >
                      {transaction.icon}
                    </div>
                    <div className="mypage-transaction-info">
                      <strong>{transaction.title}</strong>
                      <span>{transaction.detail}</span>
                    </div>
                    <span className="mypage-transaction-status">
                      {transaction.status}
                    </span>
                    <time>{transaction.date}</time>
                    <button
                      aria-label={`${transaction.title} 상세 보기`}
                      type="button"
                    >
                      ···
                    </button>
                  </article>
                ))}
              </div>
            )}

            {activeMenu === "favorites" && (
              <div className="mypage-favorite-grid">
                {favoriteItems.map((item, index) => (
                  <article className="mypage-favorite-card" key={item.title}>
                    <div
                      aria-hidden="true"
                      className={`mypage-favorite-visual visual-${index + 1}`}
                    >
                      <span>{["▧", "♫", "◉", "▤"][index]}</span>
                      <span className="mypage-favorite-heart">♥</span>
                    </div>
                    <div className="mypage-favorite-info">
                      <strong>{item.title}</strong>
                      <b>{item.price}</b>
                      <span>{item.location}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeMenu === "reviews" && (
              <div className="mypage-review-list">
                {receivedReviews.map((review) => (
                  <article className="mypage-review-card" key={review.name}>
                    <div className="mypage-review-avatar">
                      {review.name.slice(0, 1)}
                    </div>
                    <div className="mypage-review-body">
                      <div className="mypage-review-meta">
                        <strong>{review.name}</strong>
                        <time>{review.date}</time>
                      </div>
                      <p>{review.text}</p>
                      <span className="mypage-review-tag">✦ {review.tag}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {activeMenu === "overview" && (
              <div className="mypage-review-teaser">
                <span aria-hidden="true">✳</span>
                <div>
                  <strong>이웃에게 받은 따뜻한 후기</strong>
                  <p>“응답도 빠르고 친절하게 안내해 주셨어요!”</p>
                </div>
                <button onClick={() => setActiveMenu("reviews")} type="button">
                  후기 보기 <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </section>

          <footer className="mypage-footer">
            <span>REOWN</span>
            <span>가까운 이웃과 함께하는 지속 가능한 거래</span>
            <span>© 2026 reown</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default MyPage;
