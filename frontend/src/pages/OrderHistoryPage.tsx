import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import SiteHeader from "../components/SiteHeader"
import "./OrderHistoryPage.css"

type OrderStatus = "RESERVED" | "COMPLETED" | "CANCELED"
type OrderFilter = "ALL" | OrderStatus

interface OrderItem {
  id: string
  createdAt: string
  status: OrderStatus
  finalPrice: number
  product: {
    id: string
    title: string
    image: string | null
  }
  seller: {
    nickname: string
  }
}

const orderTabs: { value: OrderFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "RESERVED", label: "예약중" },
  { value: "COMPLETED", label: "거래완료" },
  { value: "CANCELED", label: "취소" },
]

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case "RESERVED":
      return "예약중"
    case "COMPLETED":
      return "거래완료"
    case "CANCELED":
      return "취소"
  }
}

const getStatusClass = (status: OrderStatus) => {
  switch (status) {
    case "RESERVED":
      return "reserved"
    case "COMPLETED":
      return "complete"
    case "CANCELED":
      return "cancelled"
  }
}

export default function OrderHistoryPage() {
  const [orders] = useState<OrderItem[]>([])
  const [activeTab, setActiveTab] = useState<OrderFilter>("ALL")
  const [search, setSearch] = useState("")

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (activeTab === "ALL" || order.status === activeTab) &&
          `${order.product.title} ${order.seller.nickname} ${order.id}`
            .toLocaleLowerCase("ko-KR")
            .includes(search.trim().toLocaleLowerCase("ko-KR")),
      ),
    [activeTab, orders, search],
  )

  const statusCounts = orderTabs.map((tab) => ({
    ...tab,
    count:
      tab.value === "ALL"
        ? orders.length
        : orders.filter((order) => order.status === tab.value).length,
  }))

  return (
    <div className="app-shell orders-page">
      <SiteHeader search={search} onSearchChange={setSearch} />
      <main className="orders-main">
        <section className="orders-intro">
          <div>
            <span className="orders-eyebrow">MY PURCHASES</span>
            <h1>주문 내역</h1>
            <p>구매한 상품과 거래 진행 상황을 한눈에 확인해 보세요.</p>
          </div>
          <Link className="orders-browse-link" to="/market">
            상품 둘러보기 <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section className="orders-summary" aria-label="주문 현황 요약">
          {statusCounts.map((item) => (
            <button
              aria-pressed={activeTab === item.value}
              className={`orders-summary-card${activeTab === item.value ? " is-active" : ""}`}
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              type="button"
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </section>

        <section className="orders-content" aria-labelledby="orders-list-title">
          <div className="orders-content-heading">
            <div>
              <h2 id="orders-list-title">구매 목록</h2>
              <span>{filteredOrders.length}건</span>
            </div>
            <div className="orders-tabs" role="tablist" aria-label="주문 상태">
              {orderTabs.map((tab) => (
                <button
                  aria-selected={activeTab === tab.value}
                  className={activeTab === tab.value ? "is-active" : ""}
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="orders-empty">
              <span className="orders-empty-icon" aria-hidden="true">
                ▤
              </span>
              <h3>
                {orders.length === 0
                  ? "아직 주문 내역이 없어요"
                  : "해당 상태의 주문이 없어요"}
              </h3>
              <p>
                {orders.length === 0
                  ? "마음에 드는 상품을 찾아 이웃과 거래를 시작해 보세요."
                  : "다른 상태를 선택해 주문 내역을 확인해 보세요."}
              </p>
              {orders.length === 0 && (
                <Link className="orders-empty-link" to="/market">
                  중고거래 둘러보기
                </Link>
              )}
            </div>
          ) : (
            <div className="orders-grid">
              {filteredOrders.map((order) => (
                <article className="order-card" key={order.id}>
                  <header className="order-card-header">
                    <div>
                      <time>
                        {new Date(order.createdAt).toLocaleDateString("ko-KR")}
                      </time>
                      <span>주문번호 {order.id}</span>
                    </div>
                    <span
                      className={`order-status order-status-${getStatusClass(order.status)}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </header>
                  <div className="order-product">
                    {order.product.image ? (
                      <img src={order.product.image} alt={order.product.title} />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="order-product-placeholder"
                      >
                        ▧
                      </div>
                    )}
                    <div className="order-product-info">
                      <span>판매자 · {order.seller.nickname}</span>
                      <h3>{order.product.title}</h3>
                      <strong>
                        {order.finalPrice.toLocaleString("ko-KR")}원
                      </strong>
                    </div>
                  </div>
                  <footer className="order-card-actions">
                    <Link to={`/products/${order.product.id}`}>
                      상품 상세보기
                    </Link>
                    {order.status === "COMPLETED" && (
                      <Link
                        to={`/review?transactionId=${encodeURIComponent(order.id)}`}
                      >
                        후기 작성
                      </Link>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <footer className="site-footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <p>가까운 이웃과 함께하는 지속 가능한 거래</p>
        <span>© 2026 reown. All rights reserved.</span>
      </footer>
    </div>
  )
}
