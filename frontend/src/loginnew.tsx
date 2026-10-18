import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import RegionSelector, { type Region } from './components/RegionSelector'
import './Login.css'

type SignupResponse = {
  data?: {
    user?: {
      nickname?: string
      region?: Region | null
    }
  }
  error?: {
    message?: string
    details?: Record<string, string>
  }
}

// 백엔드가 400 응답의 error.details로 돌려주는 회원가입 입력 필드 (docs/API.md 회원가입)
type SignupField = 'email' | 'nickname' | 'password' | 'regionId'
type FieldErrors = Partial<Record<SignupField, string>>
const signupFields: SignupField[] = ['email', 'nickname', 'password', 'regionId']

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

// 세종특별자치시처럼 sigungu가 null인 지역도 빈 값 없이 표시한다.
const formatRegion = (region: Region): string =>
  [region.sido, region.sigungu, region.eupmyeondong]
    .filter((part): part is string => Boolean(part))
    .join(' ')

function SignupPage() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [regionId, setRegionId] = useState('')
  const [regionName, setRegionName] = useState('')
  const [createdNickname, setCreatedNickname] = useState('')
  const [createdRegionName, setCreatedRegionName] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setFieldErrors({})

    if (!regionId) {
      setFieldErrors({ regionId: '동네를 선택해 주세요.' })
      return
    }

    if (password !== passwordConfirm) {
      setErrorMessage('비밀번호가 서로 일치하지 않습니다.')
      return
    }

    if (!agreed) {
      setErrorMessage('이용약관 및 개인정보 처리방침에 동의해 주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // regionId는 지역 검색 결과의 id 문자열 그대로 보낸다 (숫자로 바꾸지 않는다).
        body: JSON.stringify({ email, password, nickname, regionId }),
      })
      const result = (await response.json()) as SignupResponse

      if (!response.ok) {
        const details = result.error?.details ?? {}
        const nextFieldErrors: FieldErrors = {}
        for (const field of signupFields) {
          if (details[field]) nextFieldErrors[field] = details[field]
        }
        setFieldErrors(nextFieldErrors)
        setErrorMessage(
          result.error?.message ?? '회원가입에 실패했습니다. 입력 정보를 확인해 주세요.',
        )
        return
      }

      const createdRegion = result.data?.user?.region
      setCreatedRegionName(createdRegion ? formatRegion(createdRegion) : regionName)
      setCreatedNickname(result.data?.user?.nickname ?? nickname)
    } catch {
      setErrorMessage(
        '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page signup-page">
      <div className="login-topbar">
        <Link className="brand" to="/" aria-label="REOWN 홈">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <Link className="login-back-link" to="/login">
          이미 회원이신가요? 로그인 <span aria-hidden="true">→</span>
        </Link>
      </div>

      <div className="login-layout">
        <section className="login-welcome">
          <span className="login-eyebrow"><span /> A BETTER WAY TO PASS IT ON</span>
          <h1>좋은 거래의 시작,<br />reown과 함께.</h1>
          <p>가까운 이웃과 믿을 수 있는 거래를 시작해 보세요.</p>
          <div className="login-welcome-art" aria-hidden="true">
            <div className="welcome-circle circle-back" />
            <div className="welcome-circle circle-front" />
            <div className="welcome-card">
              <span>우리 동네에서</span>
              <strong>필요한 물건을<br />더 가치 있게</strong>
              <div className="welcome-card-mark">r</div>
            </div>
            <span className="welcome-sparkle sparkle-a">✳</span>
            <span className="welcome-sparkle sparkle-b">✦</span>
            <span className="welcome-pill">이웃과 함께하는 순환</span>
          </div>
          <div className="login-trust">
            <span className="trust-check">✓</span>
            <span><strong>간편한 가입</strong>으로 동네 거래를 시작하세요</span>
          </div>
        </section>

        <section className="login-panel" aria-labelledby="signup-title">
          <div className="login-panel-heading">
            <span className="section-kicker">JOIN THE NEIGHBORHOOD</span>
            <h2 id="signup-title">{createdNickname ? '가입 완료' : '회원가입'}</h2>
            <p>
              {createdNickname
                ? 'reown의 이웃이 되어 주셔서 감사합니다.'
                : '간단한 정보 입력으로 가입할 수 있어요.'}
            </p>
          </div>

          {createdNickname ? (
            <div className="signup-success" role="status">
              <span className="signup-success-icon" aria-hidden="true">✓</span>
              <h3>{createdNickname}님, 환영합니다!</h3>
              {createdRegionName && <p>내 동네: {createdRegionName}</p>}
              <p>회원가입이 완료되었어요.<br />로그인하고 reown을 시작해 보세요.</p>
              <Link className="login-submit" to="/login">로그인하러 가기</Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="signup-nickname">닉네임</label>
              <input
                autoComplete="nickname"
                id="signup-nickname"
                maxLength={20}
                minLength={2}
                onChange={(event) => setNickname(event.target.value)}
                pattern="[가-힣a-zA-Z0-9]{2,20}"
                placeholder="한글, 영문, 숫자 2~20자"
                required
                title="한글, 영문, 숫자로 2자 이상 20자 이하여야 합니다."
                value={nickname}
              />
              {fieldErrors.nickname && (
                <p className="signup-field-error" role="alert">{fieldErrors.nickname}</p>
              )}

              <label htmlFor="signup-email">이메일</label>
              <input
                autoComplete="email"
                id="signup-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={email}
              />
              {fieldErrors.email && (
                <p className="signup-field-error" role="alert">{fieldErrors.email}</p>
              )}

              <label id="signup-region-label">내 동네</label>
              <div
                aria-labelledby="signup-region-label"
                className="signup-region-field"
                role="group"
              >
                <RegionSelector
                  onSelect={(name, region) => {
                    setRegionName(name)
                    setRegionId(region.id)
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.regionId
                      return next
                    })
                  }}
                  selectedRegion={regionName || '동네를 검색해 선택해 주세요'}
                />
              </div>
              {fieldErrors.regionId && (
                <p className="signup-field-error" role="alert">{fieldErrors.regionId}</p>
              )}

              <div className="password-label-row">
                <label htmlFor="signup-password">비밀번호</label>
                <button
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? '숨기기' : '표시'}
                </button>
              </div>
              <input
                autoComplete="new-password"
                id="signup-password"
                maxLength={72}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8~72자로 입력해 주세요"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              {fieldErrors.password && (
                <p className="signup-field-error" role="alert">{fieldErrors.password}</p>
              )}

              <label htmlFor="signup-password-confirm">비밀번호 확인</label>
              <input
                autoComplete="new-password"
                id="signup-password-confirm"
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="비밀번호를 한 번 더 입력해 주세요"
                required
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
              />

              <div className="login-options">
                <label className="remember-option">
                  <input
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
                </label>
              </div>

              <button className="login-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? '가입 처리 중...' : '회원가입'}
              </button>
              {errorMessage && (
                <p className="signup-notice" role="alert">{errorMessage}</p>
              )}
            </form>
          )}

          <p className="login-terms">
            가입하면 reown의 <span>이용약관</span> 및{' '}
            <span>개인정보 처리방침</span>에 동의한 것으로 간주됩니다.
          </p>
        </section>
      </div>
      <footer className="login-footer">© 2026 reown · 가까운 이웃과 함께하는 지속 가능한 거래</footer>
    </main>
  )
}

export default SignupPage