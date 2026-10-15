import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Login.css'

type LoginResponse = {
  data?: {
    accessToken?: string
  }
  error?: {
    message?: string
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
const accessTokenKey = 'reown-access-token'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberLogin, setRememberLogin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = (await response.json()) as LoginResponse

      if (!response.ok) {
        setNotice(result.error?.message ?? '로그인에 실패했습니다. 입력 정보를 확인해 주세요.')
        return
      }

      const accessToken = result.data?.accessToken
      if (!accessToken) {
        setNotice('로그인 응답에 인증 정보가 없습니다. 잠시 후 다시 시도해 주세요.')
        return
      }

      window.localStorage.removeItem(accessTokenKey)
      window.sessionStorage.removeItem(accessTokenKey)
      const storage = rememberLogin ? window.localStorage : window.sessionStorage
      storage.setItem(accessTokenKey, accessToken)

      const redirectTo =
        (location.state as { from?: unknown } | null)?.from === '/safedeal'
          ? '/safedeal'
          : '/'
      navigate(redirectTo, { replace: true })
    } catch {
      setNotice('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-topbar">
        <Link className="brand" to="/" aria-label="REOWN 홈">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <Link className="login-back-link" to="/">
          홈으로 돌아가기 <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="login-layout">
        <section className="login-welcome">
          <span className="login-eyebrow"><span /> YOUR NEIGHBORHOOD, YOUR MARKET</span>
          <h1>다시 만나 반가워요.</h1>
          <p>로그인하고 우리 동네의 좋은 거래를 이어가세요.</p>
          <div className="login-welcome-art" aria-hidden="true">
            <div className="welcome-circle circle-back" />
            <div className="welcome-circle circle-front" />
            <div className="welcome-card">
              <span>오늘의 동네 픽</span>
              <strong>좋은 물건은<br />오래 순환하니까</strong>
              <div className="welcome-card-mark">r</div>
            </div>
            <span className="welcome-sparkle sparkle-a">✳</span>
            <span className="welcome-sparkle sparkle-b">✦</span>
            <span className="welcome-pill">가까운 이웃과 안심 거래</span>
          </div>
          <div className="login-trust">
            <span className="trust-check">✓</span>
            <span><strong>우리 동네 인증</strong>으로 더 안심하고 거래해요</span>
          </div>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-heading">
            <span className="section-kicker">WELCOME BACK</span>
            <h2 id="login-title">로그인</h2>
            <p>이메일과 비밀번호를 입력해 주세요.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">이메일</label>
            <input
              autoComplete="email"
              id="login-email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />

            <div className="password-label-row">
              <label htmlFor="login-password">비밀번호</label>
              <button
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? '숨기기' : '표시'}
              </button>
            </div>
            <input
              autoComplete="current-password"
              id="login-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
            />

            <div className="login-options">
              <label className="remember-option">
                <input
                  checked={rememberLogin}
                  onChange={(event) => setRememberLogin(event.target.checked)}
                  type="checkbox"
                />
                <span>로그인 상태 유지</span>
              </label>
              <button className="forgot-password" type="button">
                비밀번호를 잊으셨나요?
              </button>
            </div>

            <button className="login-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
            {notice && <p className="login-notice" role="status">{notice}</p>}
          </form>

          <div className="login-divider"><span>처음이신가요?</span></div>
          <Link className="signup-button" to="/signup">
            reown 회원가입
          </Link>
          <p className="login-terms">
            로그인하면 reown의 <span>이용약관</span> 및{' '}
            <span>개인정보 처리방침</span>에 동의한 것으로 간주됩니다.
          </p>
        </section>
      </div>
      <footer className="login-footer">© 2026 reown · 가까운 이웃과 함께하는 지속 가능한 거래</footer>
    </main>
  )
}

export default LoginPage