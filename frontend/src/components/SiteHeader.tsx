import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const menuGroups = [
  {
    id: "trade",
    label: "거래",
    links: [
      { label: "중고거래", to: "/market" },
      { label: "안전거래", to: "/safedeal" },
      { label: "주문내역", to: "/orders" },
      { label: "채팅", to: "/chats" },
    ],
  },
  {
    id: "community",
    label: "커뮤니티",
    links: [
      { label: "동네생활", to: "/location" },
      { label: "후기", to: "/review" },
      { label: "공지사항", to: "/notice" },
    ],
  },
  {
    id: "support",
    label: "고객지원",
    links: [
      { label: "문의하기", to: "/inquiry" },
      { label: "신고하기", to: "/report" },
    ],
  },
];

type SiteHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

function SiteHeader({ search, onSearchChange }: SiteHeaderProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { pathname } = useLocation();

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="REOWN 홈">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <nav className="main-nav" aria-label="주요 메뉴">
          {menuGroups.map((group) => {
            const isActive = group.links.some((item) => item.to === pathname);
            const isOpen = openMenu === group.id;
            return (
              <div
                className={`nav-group${isOpen ? " is-open" : ""}`}
                key={group.id}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpenMenu(null);
                  }
                }}
                onMouseEnter={() => setOpenMenu(group.id)}
                onMouseLeave={() => setOpenMenu(null)}
                onFocus={() => setOpenMenu(group.id)}
              >
                <button
                  aria-expanded={isOpen}
                  aria-controls={`nav-dropdown-${group.id}`}
                  className={`nav-link nav-group-trigger${isActive ? " active" : ""}`}
                  onClick={() => setOpenMenu(isOpen ? null : group.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setOpenMenu(null);
                  }}
                  type="button"
                >
                  {group.label}
                </button>
                <div
                  aria-label={`${group.label} 메뉴`}
                  className="nav-dropdown"
                  id={`nav-dropdown-${group.id}`}
                >
                  {group.links.map((item) => (
                    <NavLink
                      className={({ isActive: linkIsActive }) =>
                        `nav-dropdown-link${linkIsActive ? " active" : ""}`
                      }
                      key={item.to}
                      onClick={() => setOpenMenu(null)}
                      to={item.to}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="header-actions">
          <label className="search-box">
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              aria-label="상품 검색"
              placeholder="어떤 물건을 찾으세요?"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <Link className="login-button" to="/login">
            로그인
          </Link>
          <Link className="sell-button" to="/sell">
            <span aria-hidden="true">＋</span> 판매하기
          </Link>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
