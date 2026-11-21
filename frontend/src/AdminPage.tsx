import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getAccessToken, getAuthUser } from "./lib/auth";
import { getInquiries, getReports } from "./lib/support";
import "./AdminPage.css";

type AdminTab = "reports" | "inquiries";

function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("reports");
  const user = getAccessToken() ? getAuthUser() : null;

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  const reports = getReports();
  const inquiries = getInquiries();

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="brand" to="/" aria-label="REOWN 홈">
          <span className="brand-mark">r</span>
          <span>reown</span>
        </Link>
        <div>
          <strong>관리자 페이지</strong>
          <span>{user.nickname}</span>
        </div>
      </header>

      <section className="admin-content">
        <h1>신고 및 문의 관리</h1>
        <div className="admin-tabs">
          <button
            className={activeTab === "reports" ? "active" : ""}
            onClick={() => setActiveTab("reports")}
            type="button"
          >
            신고내역 <span>{reports.length}</span>
          </button>
          <button
            className={activeTab === "inquiries" ? "active" : ""}
            onClick={() => setActiveTab("inquiries")}
            type="button"
          >
            문의내역 <span>{inquiries.length}</span>
          </button>
        </div>

        {activeTab === "reports" ? (
          <div className="admin-list">
            {reports.length === 0 ? (
              <p className="admin-empty">접수된 신고가 없습니다.</p>
            ) : (
              reports
                .slice()
                .reverse()
                .map((item) => (
                  <article className="admin-record" key={item.id}>
                    <div>
                      <strong>{item.reason}</strong>
                      <time>{new Date(item.createdAt).toLocaleString("ko-KR")}</time>
                    </div>
                    <dl>
                      <dt>피신고자 ID</dt><dd>{item.reportedUserId}</dd>
                      <dt>상품 ID</dt><dd>{item.productId || "-"}</dd>
                      <dt>채팅방 ID</dt><dd>{item.chatRoomId || "-"}</dd>
                    </dl>
                    <p>{item.content || "상세 내용 없음"}</p>
                  </article>
                ))
            )}
          </div>
        ) : (
          <div className="admin-list">
            {inquiries.length === 0 ? (
              <p className="admin-empty">접수된 문의가 없습니다.</p>
            ) : (
              inquiries
                .slice()
                .reverse()
                .map((item) => (
                  <article className="admin-record" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <time>{new Date(item.createdAt).toLocaleString("ko-KR")}</time>
                    </div>
                    <dl>
                      <dt>문의 유형</dt><dd>{item.category}</dd>
                      <dt>답변 이메일</dt><dd>{item.email}</dd>
                    </dl>
                    <p>{item.message}</p>
                  </article>
                ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminPage;
