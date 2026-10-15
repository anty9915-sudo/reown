import { Link } from 'react-router-dom'
import { categories } from './data/categories'
import { getSelectedRegion } from './utils/selectedRegion'
import './Sell.css'

function SellPage() {
  return (
    <div className="sell-page">
      <header className="sell-page-header">
        <Link className="sell-page-brand" to="/" aria-label="REOWN 홈">
          <span className="sell-page-brand-mark">r</span>
          <span>reown</span>
        </Link>
        <Link className="sell-page-back" to="/market">
          <span aria-hidden="true">←</span> 매물 둘러보기
        </Link>
      </header>

      <main className="sell-page-main">
        <div className="sell-page-heading">
          <span className="sell-page-kicker">PASS IT ON, WITH REOWN</span>
          <h1>새로운 주인을 기다리는 물건을 소개해 주세요.</h1>
          <p>상품 정보를 작성하면 이웃들이 확인하고 연락할 수 있어요.</p>
        </div>

        <div className="sell-page-layout">
          <form
            className="sell-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <section aria-labelledby="sell-photo-title" className="sell-form-section">
              <div className="sell-section-heading">
                <span className="sell-section-number">01</span>
                <div>
                  <h2 id="sell-photo-title">상품 사진</h2>
                  <p>상품의 상태가 잘 보이는 사진을 준비해 주세요.</p>
                </div>
              </div>
              <label className="sell-photo-upload">
                <input accept="image/*" multiple type="file" />
                <span aria-hidden="true" className="sell-photo-icon">＋</span>
                <strong>사진 추가하기</strong>
                <small>상품 사진은 최대 10장까지 등록할 수 있어요.</small>
              </label>
            </section>

            <section aria-labelledby="sell-info-title" className="sell-form-section">
              <div className="sell-section-heading">
                <span className="sell-section-number">02</span>
                <div>
                  <h2 id="sell-info-title">상품 정보</h2>
                  <p>정확하고 자세한 설명이 좋은 거래로 이어져요.</p>
                </div>
              </div>

              <label className="sell-field">
                <span>상품명 <i>필수</i></span>
                <input maxLength={60} placeholder="예: 깨끗하게 사용한 무선 이어폰" type="text" />
              </label>

              <label className="sell-field">
                <span>카테고리 <i>필수</i></span>
                <select defaultValue="">
                  <option disabled value="">카테고리를 선택해 주세요</option>
                  {categories.filter((category) => category !== '전체').map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="sell-field">
                <span>가격 <i>필수</i></span>
                <div className="sell-price-input">
                  <input min="0" placeholder="가격을 입력해 주세요" type="number" />
                  <span>원</span>
                </div>
              </label>

              <label className="sell-field">
                <span>상품 설명</span>
                <textarea
                  maxLength={2000}
                  placeholder="상품의 상태, 사용 기간, 거래 시 참고할 내용을 적어 주세요."
                  rows={6}
                />
              </label>

              <div className="sell-field">
                <span>거래 지역</span>
                <div className="sell-region-value">
                  <span aria-hidden="true">⌖</span>
                  {getSelectedRegion()}
                </div>
                <small className="sell-field-hint">내 지역 설정을 기준으로 표시돼요.</small>
              </div>
            </section>

            <div className="sell-submit-area">
              <button className="sell-submit-button" disabled type="button">
                상품 등록 준비 중
              </button>
              <p>상품 등록 기능은 현재 준비 중이에요.</p>
            </div>
          </form>

          <aside className="sell-page-aside">
            <div aria-hidden="true" className="sell-aside-illustration">
              <div className="sell-aside-orbit" />
              <div className="sell-aside-box">
                <span>r</span>
                <i>✦</i>
              </div>
              <span className="sell-aside-sparkle sell-aside-sparkle-one">✳</span>
              <span className="sell-aside-sparkle sell-aside-sparkle-two">✦</span>
            </div>
            <span className="sell-aside-kicker">A LITTLE SELLING GUIDE</span>
            <h2>좋은 거래는<br />좋은 소개에서 시작돼요.</h2>
            <ul>
              <li><span>✓</span> 밝은 곳에서 상품 사진을 찍어 주세요.</li>
              <li><span>✓</span> 사용감이나 흠집도 솔직하게 알려 주세요.</li>
              <li><span>✓</span> 거래 조건을 미리 정하면 더 편리해요.</li>
            </ul>
            <Link to="/safedeal">안전거래 알아보기 <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </main>

      <footer className="sell-page-footer">
        <span>reown</span>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <small>© 2026 reown. All rights reserved.</small>
      </footer>
    </div>
  )
}

export default SellPage