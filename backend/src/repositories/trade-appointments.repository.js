// 상품 삭제·거래완료·예약취소에 따라 거래 약속 상태를 자동 정리한다.
export const closeAppointmentsForProductDeletion = async (db, productId) => {
  const canceled = await db.query(
    `UPDATE public.trade_appointments ta
     SET status = 'CANCELED', closed_at = now(), closed_by = NULL
     FROM public.chat_rooms cr
     WHERE cr.id = ta.chat_room_id
       AND cr.product_id = $1
       AND ta.status = 'SCHEDULED'
       AND ta.scheduled_at > now()
     RETURNING ta.id, cr.buyer_id AS "buyerId"`,
    [productId],
  );

  await db.query(
    `UPDATE public.trade_appointments ta
     SET status = 'EXPIRED', closed_at = now(), closed_by = NULL
     FROM public.chat_rooms cr
     WHERE cr.id = ta.chat_room_id
       AND cr.product_id = $1
       AND ta.status = 'SCHEDULED'
       AND ta.scheduled_at <= now()`,
    [productId],
  );

  return canceled.rows;
};

// 거래완료 구매자의 약속은 EXPIRED, 다른 구매자의 미래 약속은 CANCELED 처리한다.
export const closeAppointmentsForCompletedTrade = async (
  db,
  productId,
  selectedChatRoomId,
) => {
  await db.query(
    `UPDATE public.trade_appointments
     SET status = 'EXPIRED', closed_at = now(), closed_by = NULL
     WHERE chat_room_id = $1 AND status = 'SCHEDULED'`,
    [selectedChatRoomId],
  );

  const canceled = await db.query(
    `UPDATE public.trade_appointments ta
     SET status = 'CANCELED', closed_at = now(), closed_by = NULL
     FROM public.chat_rooms cr
     WHERE cr.id = ta.chat_room_id
       AND cr.product_id = $1
       AND ta.chat_room_id <> $2
       AND ta.status = 'SCHEDULED'
       AND ta.scheduled_at > now()
     RETURNING ta.id, cr.buyer_id AS "buyerId"`,
    [productId, selectedChatRoomId],
  );

  await db.query(
    `UPDATE public.trade_appointments ta
     SET status = 'EXPIRED', closed_at = now(), closed_by = NULL
     FROM public.chat_rooms cr
     WHERE cr.id = ta.chat_room_id
       AND cr.product_id = $1
       AND ta.chat_room_id <> $2
       AND ta.status = 'SCHEDULED'
       AND ta.scheduled_at <= now()`,
    [productId, selectedChatRoomId],
  );

  return canceled.rows;
};

// 예약 취소된 채팅방의 미래 약속은 CANCELED, 지난 약속은 EXPIRED 처리한다.
export const closeAppointmentsForReservationCancel = async (db, chatRoomId) => {
  await db.query(
    `UPDATE public.trade_appointments
     SET status = CASE WHEN scheduled_at > now() THEN 'CANCELED' ELSE 'EXPIRED' END,
         closed_at = now(),
         closed_by = NULL
     WHERE chat_room_id = $1 AND status = 'SCHEDULED'`,
    [chatRoomId],
  );
};
