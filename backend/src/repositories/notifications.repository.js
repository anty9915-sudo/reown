// 원래 상태 변경과 같은 DB 트랜잭션 안에서 알림 행을 저장한다.
export const createNotification = async (
  db,
  { userId, type, priceOfferId, transactionId, tradeAppointmentId },
) => {
  await db.query(
    `INSERT INTO public.notifications (
       user_id, type, price_offer_id, transaction_id, trade_appointment_id
     ) VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      type,
      priceOfferId ?? null,
      transactionId ?? null,
      tradeAppointmentId ?? null,
    ],
  );
};

// 자동 종료된 가격 제안마다 구매자 알림을 만든다.
export const createOfferExpiredNotifications = async (db, offers) => {
  for (const offer of offers) {
    await createNotification(db, {
      userId: offer.buyerId,
      type: 'PRICE_OFFER_EXPIRED',
      priceOfferId: offer.id,
    });
  }
};

// 자동 취소된 약속마다 구매자 알림을 만든다.
export const createAppointmentCanceledNotifications = async (
  db,
  appointments,
) => {
  for (const appointment of appointments) {
    await createNotification(db, {
      userId: appointment.buyerId,
      type: 'APPOINTMENT_CANCELED',
      tradeAppointmentId: appointment.id,
    });
  }
};
