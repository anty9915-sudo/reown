import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import SiteHeader from "./components/SiteHeader"
import "./inquiry.css"

function InquiryPage() {
  const [search, setSearch] = useState("")
  const [notice, setNotice] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(
      "문의 접수 기능이 아직 연결되지 않아 전송되지 않았어요. 작성한 내용은 저장되지 않았습니다.",
    )
  }

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />
      <main className="inquiry-page">
        <div className="inquiry-heading">
          <p className="inquiry-eyebrow">WE'RE HERE TO HELP</p>
          <h1>무엇을 도와드릴까요?</h1>
          <p>REOWN 이용 중 궁금한 점이나 불편한 점을 알려주세요.</p>
        </div>

        <div className="inquiry-layout">
          <aside className="inquiry-help-card">
            <span className="inquiry-help-icon" aria-hidden="true">
              ✉
            </span>
            <h2>문의 전 확인해 주세요</h2>
            <p>
              자주 묻는 내용은 공지사항과 안전거래 안내에서 먼저 확인하실 수
              있어요.
            </p>
            <Link to="/notice">공지사항 보기 <span aria-hidden="true">→</span></Link>
            <Link to="/safedeal">안전거래 안내 <span aria-hidden="true">→</span></Link>
          </aside>

          <section className="inquiry-form-card" aria-labelledby="inquiry-form-title">
            <div className="inquiry-form-heading">
              <h2 id="inquiry-form-title">문의 내용</h2>
              <p><span aria-hidden="true">*</span> 표시는 필수 입력 항목입니다.</p>
            </div>

            <form className="inquiry-form" onSubmit={handleSubmit}>
              <label>
                문의 유형 <span aria-hidden="true">*</span>
                <select name="category" required defaultValue="">
                  <option value="" disabled>문의 유형을 선택해 주세요</option>
                  <option value="account">계정·로그인</option>
                  <option value="trade">거래·채팅</option>
                  <option value="report">신고·안전</option>
                  <option value="technical">서비스 오류</option>
                  <option value="other">기타</option>
                </select>
              </label>

              <label>
                답변 받을 이메일 <span aria-hidden="true">*</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="example@email.com"
                  required
                  type="email"
                />
              </label>

              <label>
                제목 <span aria-hidden="true">*</span>
                <input
                  maxLength={100}
                  name="title"
                  placeholder="문의 제목을 입력해 주세요"
                  required
                />
              </label>

              <label>
                문의 내용 <span aria-hidden="true">*</span>
                <textarea
                  maxLength={2000}
                  name="message"
                  placeholder="문의하실 내용을 자세히 적어 주세요."
                  required
                  rows={7}
                />
              </label>

              {notice && (
                <p className="inquiry-notice" role="status">
                  {notice}
                </p>
              )}

              <button className="inquiry-submit" type="submit">
                문의 접수
              </button>
              <p className="inquiry-form-footnote">
                현재 문의 접수 기능을 준비 중입니다. 제출해도 내용이 전송되거나
                저장되지 않습니다.
              </p>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

export default InquiryPage