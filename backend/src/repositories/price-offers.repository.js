// 거래 가격 계산과 상품 종료 시 가격 제안 자동 정리를 담당하는 SQL 모음이다.
export const findLatestAcceptedOfferPrice = async (db, chatRoomId) => {
  const result = await db.query(
    `SELECT offered_price AS "offeredPrice"
     FROM public.price_offers
     WHERE chat_room_id = $1 AND status = 'ACCEPTED'
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [chatRoomId],
  );
  return result.rows[0]?.offeredPrice ?? null;
};

// 상품 삭제 시 모든 진행 중·수락된 제안을 EXPIRED로 바꾼다.
export const expireOffersForProductDeletion = async (db, productId) => {
  const result = await db.query(
    `UPDATE public.price_offers po
     SET status = 'EXPIRED', responded_at = coalesce(po.responded_at, now())
     FROM public.chat_rooms cr
     WHERE cr.id = po.chat_room_id
       AND cr.product_id = $1
       AND po.status IN ('PENDING', 'ACCEPTED')
     RETURNING po.id, cr.buyer_id AS "buyerId"`,
    [productId],
  );
  return result.rows;
};

// 거래완료 시 선택된 방의 수락 제안만 남기고 나머지 유효 제안을 종료한다.
export const expireOffersForCompletedTrade = async (
  db,
  productId,
  selectedChatRoomId,
) => {
  const result = await db.query(
    `UPDATE public.price_offers po
     SET status = 'EXPIRED', responded_at = coalesce(po.responded_at, now())
     FROM public.chat_rooms cr
     WHERE cr.id = po.chat_room_id
       AND cr.product_id = $1
       AND (
         po.status = 'PENDING'
         OR (po.status = 'ACCEPTED' AND po.chat_room_id <> $2)
       )
     RETURNING po.id, po.chat_room_id AS "chatRoomId", cr.buyer_id AS "buyerId"`,
    [productId, selectedChatRoomId],
  );
  return result.rows;
};
