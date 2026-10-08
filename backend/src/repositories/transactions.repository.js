// transactions service가 거래 생성·전환에 사용하는 transactions 전용 SQL이다.
// db 인자는 같은 트랜잭션에 연결된 pg client를 받는다.
export const findProductChatForUpdate = async (
  db,
  productId,
  chatRoomId,
) => {
  // 상품과 채팅방 관계, 판매자·구매자, 차단 여부를 확인하고 상품 행을 잠근다.
  const result = await db.query(
    `SELECT
       p.id AS "productId",
       p.seller_id AS "sellerId",
       p.price,
       p.status AS "productStatus",
       p.deleted_at AS "deletedAt",
       cr.id AS "chatRoomId",
       cr.buyer_id AS "buyerId",
       EXISTS (
         SELECT 1
         FROM public.blocks b
         WHERE (b.blocker_id = p.seller_id AND b.blocked_id = cr.buyer_id)
            OR (b.blocker_id = cr.buyer_id AND b.blocked_id = p.seller_id)
       ) AS "isBlocked"
     FROM public.products p
     JOIN public.chat_rooms cr
       ON cr.product_id = p.id AND cr.id = $2
     WHERE p.id = $1
     FOR UPDATE OF p`,
    [productId, chatRoomId],
  );
  return result.rows[0] ?? null;
};

// 예약 또는 바로 완료된 거래 행을 생성한다.
export const createTransaction = async (
  db,
  { productId, buyerId, finalPrice, status },
) => {
  const result = await db.query(
    `INSERT INTO public.transactions (
       product_id, buyer_id, final_price, status, completed_at
     ) VALUES ($1, $2, $3, $4, CASE WHEN $4 = 'COMPLETED' THEN now() END)
     RETURNING id, product_id AS "productId", buyer_id AS "buyerId",
       final_price AS "finalPrice", status, created_at AS "createdAt",
       completed_at AS "completedAt", canceled_at AS "canceledAt"`,
    [productId, buyerId, finalPrice, status],
  );
  return result.rows[0];
};

// 기존 거래와 상품을 동시에 잠가 두 상태가 어긋나는 것을 방지한다.
export const findTransactionForUpdate = async (db, transactionId) => {
  const result = await db.query(
    `SELECT
       t.id, t.product_id AS "productId", t.buyer_id AS "buyerId",
       t.final_price AS "finalPrice", t.status,
       p.seller_id AS "sellerId", p.status AS "productStatus",
       p.deleted_at AS "deletedAt", cr.id AS "chatRoomId"
     FROM public.transactions t
     JOIN public.products p ON p.id = t.product_id
     JOIN public.chat_rooms cr
       ON cr.product_id = t.product_id AND cr.buyer_id = t.buyer_id
     WHERE t.id = $1
     FOR UPDATE OF t, p`,
    [transactionId],
  );
  return result.rows[0] ?? null;
};

// RESERVED 거래를 최종 상태인 COMPLETED로 변경한다.
export const completeTransaction = async (db, transactionId) => {
  const result = await db.query(
    `UPDATE public.transactions
     SET status = 'COMPLETED', completed_at = now()
     WHERE id = $1 AND status = 'RESERVED'
     RETURNING id, product_id AS "productId", buyer_id AS "buyerId",
       final_price AS "finalPrice", status, created_at AS "createdAt",
       completed_at AS "completedAt", canceled_at AS "canceledAt"`,
    [transactionId],
  );
  return result.rows[0] ?? null;
};

// RESERVED 거래를 CANCELED로 변경해 상품을 다시 판매할 수 있게 한다.
export const cancelTransaction = async (db, transactionId) => {
  const result = await db.query(
    `UPDATE public.transactions
     SET status = 'CANCELED', canceled_at = now()
     WHERE id = $1 AND status = 'RESERVED'
     RETURNING id, product_id AS "productId", buyer_id AS "buyerId",
       final_price AS "finalPrice", status, created_at AS "createdAt",
       completed_at AS "completedAt", canceled_at AS "canceledAt"`,
    [transactionId],
  );
  return result.rows[0] ?? null;
};
