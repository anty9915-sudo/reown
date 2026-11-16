import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import SiteHeader from "./components/SiteHeader"
import "./report.css"

function ReportPage() {
  const [search, setSearch] = useState("")
  const [notice, setNotice] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(
      "신고 접수 기능이 아직 연결되지 않아 전송되지 않았어요. 작성한 내용은 저장되지 않았습니다.",
    )
  }

  return (
    <div className="app-shell">
      <SiteHeader search={search} onSearchChange={setSearch} />
      <main className="report-page">
        <div className="report-heading">
          <p className="report-eyebrow">KEEP REOWN SAFE</p>
          <h1>신고하기</h1>
          <p>불편하거나 부적절한 내용을 알려주시면 안전한 이용에 도움이 됩니다.</p>
        </div>

        <section className="report-info" aria-label="신고 안내">
          <span aria-hidden="true">!</span>
          <p>
            신고 내용은 확인을 위해서만 사용해 주세요. 허위 신고는 다른 이용자에게
            피해를 줄 수 있습니다.
          </p>
        </section>

        <section className="report-form-card" aria-labelledby="report-form-title">
          <div className="report-form-heading">
            <h2 id="report-form-title">신고 내용</h2>
            <p><span aria-hidden="true">*</span> 필수 입력</p>
          </div>

          <form className="report-form" onSubmit={handleSubmit}>
            <label>
              신고 사유 <span aria-hidden="true">*</span>
              <select name="reason" required defaultValue="">
                <option value="" disabled>신고 사유를 선택해 주세요</option>
                <option value="FRAUD">사기·허위 매물</option>
                <option value="ABUSE">욕설·괴롭힘</option>
                <option value="PROHIBITED_ITEM">거래 금지 품목</option>
                <option value="SPAM">도배·광고</option>
                <option value="ETC">기타</option>
              </select>
            </label>

            <label>
              신고 대상 회원 ID <span aria-hidden="true">*</span>
              <input
                inputMode="numeric"
                name="reportedUserId"
                pattern="[1-9][0-9]*"
                placeholder="신고 대상 회원 ID"
                required
              />
            </label>

            <div className="report-form-row">
              <label>
                관련 상품 ID <span className="report-optional">(선택)</span>
                <input
                  inputMode="numeric"
                  name="productId"
                  pattern="[1-9][0-9]*"
                  placeholder="상품 ID"
                />
              </label>
              <label>
                관련 채팅방 ID <span className="report-optional">(선택)</span>
                <input
                  inputMode="numeric"
                  name="chatRoomId"
                  pattern="[1-9][0-9]*"
                  placeholder="채팅방 ID"
                />
              </label>
            </div>

            <label>
              상세 내용 <span className="report-optional">(선택)</span>
              <textarea
                maxLength={1000}
                name="content"
                placeholder="신고 사유를 확인할 수 있도록 상황을 구체적으로 적어 주세요."
                rows={6}
              />
              <span className="report-field-hint">최대 1,000자</span>
            </label>

            {notice && (
              <p className="report-notice" role="status">
                {notice}
              </p>
            )}

            <button className="report-submit" type="submit">
              신고 접수
            </button>
            <p className="report-form-footnote">
              현재 신고 접수 기능을 준비 중입니다. 제출해도 내용이 전송되거나
              저장되지 않습니다.
            </p>
          </form>
        </section>

        <Link className="report-back-link" to="/market">
          상품 둘러보기 <span aria-hidden="true">→</span>
        </Link>
      </main>
    </div>
  )
}

export default ReportPage