import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Review.css'

const reviewTags = ['친절해요', '응답이 빨라요', '상품 상태가 좋아요', '시간 약속을 잘 지켜요']

function ReviewPage() {
  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [content, setContent] = useState('')

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((selectedTag) => selectedTag !== tag)
        : [...current, tag],
    )
  }

  return (
    <div className="review-page">
      <header className="review-header">
        <Link aria-label="REOWN 홈" className="brand" to="/">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <Link className="review-back-link" to="/market">
          <span aria-hidden="true">←</span> 중고거래로 돌아가기
        </Link>
      </header>

      <main className="review-main">
        <section aria-labelledby="review-title" className="review-heading">
          <span className="review-eyebrow">A GOOD TRADE, A KIND REVIEW</span>
          <h1 id="review-title">거래 후기를 남겨주세요</h1>
          <p>따뜻한 후기가 이웃에게 좋은 거래의 기준이 돼요.</p>
        </section>

        <form
          className="review-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <section aria-label="후기 대상" className="review-target">
            <span aria-hidden="true" className="review-target-avatar">이</span>
            <div>
              <span className="review-target-label">거래 상대방</span>
              <strong>거래 완료 후 상대방을 선택할 수 있어요</strong>
            </div>
          </section>

          <fieldset className="review-rating">
            <legend>이번 거래는 어떠셨나요?</legend>
            <div aria-label="별점 선택" className="review-stars" role="group">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  aria-label={`${star}점`}
                  aria-pressed={rating === star}
                  className={star <= rating ? 'selected' : ''}
                  key={star}
                  onClick={() => setRating(star)}
                  type="button"
                >
                  ★
                </button>
              ))}
            </div>
            <p className="review-rating-hint">
              {rating === 0 ? '별점을 선택해 주세요.' : `${rating}점을 선택했어요.`}
            </p>
          </fieldset>

          <fieldset className="review-tag-field">
            <legend>어떤 점이 좋았나요? <span>선택</span></legend>
            <div className="review-tags">
              {reviewTags.map((tag) => (
                <button
                  aria-pressed={selectedTags.includes(tag)}
                  className={selectedTags.includes(tag) ? 'selected' : ''}
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  type="button"
                >
                  <span aria-hidden="true">{selectedTags.includes(tag) ? '✓' : '+'}</span>
                  {tag}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="review-content-field" htmlFor="review-content">
            <span>상세 후기 <i>선택</i></span>
            <textarea
              id="review-content"
              maxLength={300}
              onChange={(event) => setContent(event.target.value)}
              placeholder="거래 경험을 이웃에게 들려주세요."
              rows={5}
              value={content}
            />
            <span className="review-character-count">{content.length}/300</span>
          </label>

          <div className="review-submit-area">
            <button disabled type="submit">후기 등록 준비 중</button>
            <p>후기 등록 기능은 현재 준비 중이에요.</p>
          </div>
        </form>

        <Link className="review-home-link" to="/">
          메인으로 돌아가기 <span aria-hidden="true">→</span>
        </Link>
      </main>

      <footer className="review-footer">
        <span>reown</span>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <small>© 2026 reown. All rights reserved.</small>
      </footer>
    </div>
  )
}

export default ReviewPage