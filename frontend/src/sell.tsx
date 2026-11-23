import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useCategories } from "./hooks/useCategories";
import { CategoryFeedback } from "./components/CategoryFilters";
import { getSelectedRegion } from "./utils/selectedRegion";
import { getAccessToken, getAuthUser } from "./lib/auth";
import { addLocalProduct } from "./lib/products";
import "./Sell.css";

function SellPage() {
  const navigate = useNavigate();
  const user = getAccessToken() ? getAuthUser() : null;
  const [photo, setPhoto] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState(getSelectedRegion);
  const [notice, setNotice] = useState("");
  const categoryList = useCategories();
  const selectedCategory = categoryList.categories.find((item) => item.id === category);
  const canSubmit =
    title.trim().length > 0 &&
    !!selectedCategory &&
    !categoryList.loading &&
    !categoryList.error &&
    price !== "" &&
    location.trim().length > 0 &&
    Number.isFinite(Number(price)) &&
    Number(price) >= 0;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/sell" }} />;
  }

  const handlePhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setNotice("필수 항목을 모두 입력해야 상품을 등록할 수 있습니다.");
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const categoryId = String(data.get("category") ?? "");
    const category = categoryList.categories.find((item) => item.id === categoryId)?.name ?? "";
    const price = Number(data.get("price"));
    const description = String(data.get("description") ?? "").trim();

    if (
      !title ||
      !category ||
      !location.trim() ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setNotice("상품명, 카테고리, 가격, 거래 지역을 올바르게 입력해 주세요.");
      return;
    }

    addLocalProduct({
      id: Date.now(),
      title,
      category,
      price,
      location: location.trim(),
      time: "방금 전",
      image: photo,
      likes: 0,
      sellerId: Number(user.id) || undefined,
      sellerName: user.nickname,
      badge: "새 매물",
      description,
    });

    navigate("/market", {
      replace: true,
      state: { notice: "상품이 등록되었습니다." },
    });
  };

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
            onSubmit={handleSubmit}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                (event.target instanceof HTMLInputElement ||
                  event.target instanceof HTMLSelectElement)
              ) {
                event.preventDefault();
              }
            }}
          >
            <section
              aria-labelledby="sell-photo-title"
              className="sell-form-section"
            >
              <div className="sell-section-heading">
                <span className="sell-section-number">01</span>
                <div>
                  <h2 id="sell-photo-title">상품 사진</h2>
                  <p>상품의 상태가 잘 보이는 사진을 준비해 주세요.</p>
                </div>
              </div>
              <label className="sell-photo-upload">
                <input
                  accept="image/*"
                  type="file"
                  onChange={(event) => handlePhoto(event.target.files?.[0])}
                />
                <span aria-hidden="true" className="sell-photo-icon">
                  ＋
                </span>
                <strong>사진 추가하기</strong>
                {photo && (
                  <img
                    alt="등록할 상품 미리보기"
                    className="sell-photo-preview"
                    src={photo}
                  />
                )}
                <small>상품 사진은 1장을 등록할 수 있어요.</small>
              </label>
            </section>

            <section
              aria-labelledby="sell-info-title"
              className="sell-form-section"
            >
              <div className="sell-section-heading">
                <span className="sell-section-number">02</span>
                <div>
                  <h2 id="sell-info-title">상품 정보</h2>
                  <p>정확하고 자세한 설명이 좋은 거래로 이어져요.</p>
                </div>
              </div>

              <label className="sell-field">
                <span>
                  상품명 <i>필수</i>
                </span>
                <input
                  name="title"
                  maxLength={60}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setNotice("");
                  }}
                  placeholder="예: 깨끗하게 사용한 무선 이어폰"
                  required
                  type="text"
                  value={title}
                />
              </label>

              <label className="sell-field">
                <span>
                  카테고리 <i>필수</i>
                </span>
                <select
                  aria-label="카테고리 선택"
                  name="category"
                  disabled={categoryList.loading || !!categoryList.error || categoryList.categories.length === 0}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setNotice("");
                  }}
                  required
                  value={category}
                >
                  <option disabled value="">
                    {categoryList.loading ? "카테고리를 불러오는 중..." : "카테고리를 선택해 주세요"}
                  </option>
                  {categoryList.categories.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <CategoryFeedback {...categoryList} />

              <label className="sell-field">
                <span>
                  가격 <i>필수</i>
                </span>
                <div className="sell-price-input">
                  <input
                    name="price"
                    min="0"
                    onChange={(event) => {
                      setPrice(event.target.value);
                      setNotice("");
                    }}
                    placeholder="가격을 입력해 주세요"
                    required
                    type="number"
                    value={price}
                  />
                  <span>원</span>
                </div>
              </label>

              <label className="sell-field">
                <span>상품 설명</span>
                <textarea
                  name="description"
                  maxLength={2000}
                  placeholder="상품의 상태, 사용 기간, 거래 시 참고할 내용을 적어 주세요."
                  rows={6}
                />
              </label>

              <label className="sell-field">
                <span>
                  거래 지역 <i>필수</i>
                </span>
                <input
                  name="location"
                  maxLength={100}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setNotice("");
                  }}
                  placeholder="예: 서울시 강남구 역삼동"
                  required
                  type="text"
                  value={location}
                />
                <small className="sell-field-hint">
                  거래 장소를 동 단위까지 직접 입력해 주세요.
                </small>
              </label>
            </section>

            <div className="sell-submit-area">
              <button
                className="sell-submit-button"
                disabled={!canSubmit}
                type="submit"
              >
                상품 등록
              </button>
              {notice && <p role="alert">{notice}</p>}
            </div>
          </form>

          <aside className="sell-page-aside">
            <div aria-hidden="true" className="sell-aside-illustration">
              <div className="sell-aside-orbit" />
              <div className="sell-aside-box">
                <span>r</span>
                <i>✦</i>
              </div>
              <span className="sell-aside-sparkle sell-aside-sparkle-one">
                ✳
              </span>
              <span className="sell-aside-sparkle sell-aside-sparkle-two">
                ✦
              </span>
            </div>
            <span className="sell-aside-kicker">A LITTLE SELLING GUIDE</span>
            <h2>
              좋은 거래는
              <br />
              좋은 소개에서 시작돼요.
            </h2>
            <ul>
              <li>
                <span>✓</span> 밝은 곳에서 상품 사진을 찍어 주세요.
              </li>
              <li>
                <span>✓</span> 사용감이나 흠집도 솔직하게 알려 주세요.
              </li>
              <li>
                <span>✓</span> 거래 조건을 미리 정하면 더 편리해요.
              </li>
            </ul>
            <Link to="/safedeal">
              안전거래 알아보기 <span aria-hidden="true">→</span>
            </Link>
          </aside>
        </div>
      </main>

      <footer className="sell-page-footer">
        <span>reown</span>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <small>© 2026 reown. All rights reserved.</small>
      </footer>
    </div>
  );
}

export default SellPage;
