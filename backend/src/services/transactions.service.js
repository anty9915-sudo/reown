import pool from '../config/database.js';
import {
  createAppointmentCanceledNotifications,
  createNotification,
  createOfferExpiredNotifications,
} from '../repositories/notifications.repository.js';
import {
  expireOffersForCompletedTrade,
  findLatestAcceptedOfferPrice,
} from '../repositories/price-offers.repository.js';
import { setProductStatus } from '../repositories/products.repository.js';
import {
  closeAppointmentsForCompletedTrade,
  closeAppointmentsForReservationCancel,
} from '../repositories/trade-appointments.repository.js';
import {
  cancelTransaction,
  completeTransaction,
  createTransaction as insertTransaction,
  findProductChatForUpdate,
  findTransactionForUpdate,
} from '../repositories/transactions.repository.js';
import AppError from '../utils/app-error.js';

// 거래 controller와 여러 repository를 연결해 상품과 거래 상태의 정합성을 지킨다.
// 모든 상태 변경은 같은 DB client를 사용해 하나의 트랜잭션으로 처리한다.
const notFound = () =>
  new AppError(404, 'RESOURCE_NOT_FOUND', '거래 대상을 찾을 수 없습니다.');
const conflict = (message) =>
  new AppError(409, 'RESOURCE_CONFLICT', message);
const toIso = (value) => (value ? new Date(value).toISOString() : null);

const toTransaction = (row) => ({
  id: String(row.id),
  productId: String(row.productId),
  buyerId: String(row.buyerId),
  finalPrice: row.finalPrice,
  status: row.status,
  createdAt: toIso(row.createdAt),
  completedAt: toIso(row.completedAt),
  canceledAt: toIso(row.canceledAt),
});

const cleanupCompletedTrade = async (
  client,
  productId,
  selectedChatRoomId,
) => {
  // 선택된 구매자 외 다른 채팅방의 제안과 약속을 종료하고 알림을 만든다.
  const offers = await expireOffersForCompletedTrade(
    client,
    productId,
    selectedChatRoomId,
  );
  const otherBuyerOffers = offers.filter(
    (offer) => String(offer.chatRoomId) !== String(selectedChatRoomId),
  );
  const appointments = await closeAppointmentsForCompletedTrade(
    client,
    productId,
    selectedChatRoomId,
  );
  await createOfferExpiredNotifications(client, otherBuyerOffers);
  await createAppointmentCanceledNotifications(client, appointments);
};

// 판매자가 판매중 상품을 예약하거나 예약 없이 바로 거래완료할 때 호출한다.
export const createTransaction = async (productId, sellerId, body) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const context = await findProductChatForUpdate(
      client,
      productId,
      body.chatRoomId,
    );

    if (
      !context ||
      context.deletedAt ||
      String(context.sellerId) !== sellerId
    ) {
      throw notFound();
    }
    if (context.productStatus !== 'ON_SALE') {
      throw conflict('판매중인 상품만 예약하거나 거래완료할 수 있습니다.');
    }
    if (context.isBlocked) {
      throw conflict('현재 이 사용자와 거래를 진행할 수 없습니다.');
    }

    const acceptedPrice = await findLatestAcceptedOfferPrice(
      client,
      body.chatRoomId,
    );
    const transaction = await insertTransaction(client, {
      productId,
      buyerId: context.buyerId,
      finalPrice: acceptedPrice ?? context.price,
      status: body.status,
    });
    await setProductStatus(
      client,
      productId,
      body.status === 'RESERVED' ? 'RESERVED' : 'SOLD',
    );

    if (body.status === 'COMPLETED') {
      await cleanupCompletedTrade(client, productId, body.chatRoomId);
    }

    await createNotification(client, {
      userId: context.buyerId,
      type: body.status === 'RESERVED' ? 'TRADE_RESERVED' : 'TRADE_COMPLETED',
      transactionId: transaction.id,
    });
    await client.query('COMMIT');
    return toTransaction(transaction);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      throw conflict('이미 진행 중인 거래가 있습니다.');
    }
    throw error;
  } finally {
    client.release();
  }
};

// 이미 생성된 RESERVED 거래를 COMPLETED 또는 CANCELED로 전환한다.
export const updateTransaction = async (transactionId, sellerId, body) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const context = await findTransactionForUpdate(client, transactionId);

    if (!context || String(context.sellerId) !== sellerId) throw notFound();
    if (context.status !== 'RESERVED' || context.productStatus !== 'RESERVED') {
      throw conflict('예약중인 거래만 완료하거나 취소할 수 있습니다.');
    }

    let transaction;
    if (body.status === 'COMPLETED') {
      transaction = await completeTransaction(client, transactionId);
      await setProductStatus(client, context.productId, 'SOLD');
      await cleanupCompletedTrade(
        client,
        context.productId,
        context.chatRoomId,
      );
      await createNotification(client, {
        userId: context.buyerId,
        type: 'TRADE_COMPLETED',
        transactionId,
      });
    } else {
      transaction = await cancelTransaction(client, transactionId);
      await setProductStatus(client, context.productId, 'ON_SALE');
      await closeAppointmentsForReservationCancel(client, context.chatRoomId);
      await createNotification(client, {
        userId: context.buyerId,
        type: 'TRADE_CANCELED',
        transactionId,
      });
    }

    await client.query('COMMIT');
    return toTransaction(transaction);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
