const VIEW_INTERVAL_MS = 10 * 60 * 1000;
const viewedUntil = new Map();
let callsSinceCleanup = 0;

// DB 테이블을 추가하지 않고 사용자/IP별 중복 조회를 서버 메모리에서 관리한다.
// 오래된 키가 계속 쌓이지 않도록 100번 호출할 때마다 만료 항목을 정리한다.
const cleanupExpiredEntries = (now) => {
  callsSinceCleanup += 1;
  if (callsSinceCleanup < 100) {
    return;
  }

  callsSinceCleanup = 0;
  for (const [key, expiresAt] of viewedUntil) {
    if (expiresAt <= now) {
      viewedUntil.delete(key);
    }
  }
};

// products service가 true를 받은 경우에만 repository의 조회수 증가 쿼리를 호출한다.
export const shouldIncreaseViewCount = (productId, viewerKey) => {
  const now = Date.now();
  const key = `${productId}:${viewerKey}`;

  cleanupExpiredEntries(now);

  if ((viewedUntil.get(key) ?? 0) > now) {
    return false;
  }

  viewedUntil.set(key, now + VIEW_INTERVAL_MS);
  return true;
};
