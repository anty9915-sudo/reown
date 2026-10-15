import { Link, NavLink } from 'react-router-dom'

type SiteHeaderProps = {
  search: string
  onSearchChange: (value: string) => void
}

function SiteHeader({ search, onSearchChange }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="REOWN 홈">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <nav className="main-nav" aria-label="주요 메뉴">
          <NavLink
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
            to="/market"
          >
            중고거래
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
            to="/location"
          >
            동네생활
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `nav-link${isActive ? ' active' : ''}`
            }
            to="/safedeal"
          >
            안전거래
          </NavLink>
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
  )
}

export default SiteHeader
