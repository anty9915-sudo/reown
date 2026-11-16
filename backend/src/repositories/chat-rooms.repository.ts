import pool from '../config/database.js';
import type { DatabaseRow } from '../types/domain.js';

export const findProductForChat = async (
  productId: string,
): Promise<DatabaseRow | null> => {
  const result = await pool.query(
    `SELECT id, seller_id AS "sellerId", deleted_at AS "deletedAt"
     FROM public.products
     WHERE id = $1`,
    [productId],
  );
  return result.rows[0] ?? null;
};

export const isBlocked = async (userId: string, otherUserId: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM public.blocks
       WHERE (blocker_id = $1 AND blocked_id = $2)
          OR (blocker_id = $2 AND blocked_id = $1)
     ) AS blocked`,
    [userId, otherUserId],
  );
  return result.rows[0].blocked;
};

export const createOrFindChatRoom = async (
  productId: string,
  buyerId: string,
): Promise<string> => {
  const inserted = await pool.query(
    `INSERT INTO public.chat_rooms (product_id, buyer_id)
     VALUES ($1, $2)
     ON CONFLICT (product_id, buyer_id) DO NOTHING
     RETURNING id`,
    [productId, buyerId],
  );
  if (inserted.rows[0]) return String(inserted.rows[0].id);

  const existing = await pool.query(
    `SELECT id FROM public.chat_rooms
     WHERE product_id = $1 AND buyer_id = $2`,
    [productId, buyerId],
  );
  return String(existing.rows[0].id);
};

export const findChatRoomsForUser = async (userId: string): Promise<DatabaseRow[]> => {
  const result = await pool.query(
    `SELECT
       cr.id,
       p.id AS "productId",
       p.title AS "productTitle",
       CASE
         WHEN cr.buyer_id = $1 THEN seller.id
         ELSE buyer.id
       END AS "partnerId",
       CASE
         WHEN cr.buyer_id = $1 THEN seller.nickname
         ELSE buyer.nickname
       END AS "partnerNickname",
       last_message.content AS "lastMessage",
       last_message.sender_id AS "lastSenderId",
       last_message.created_at AS "lastMessageAt",
       (SELECT count(*)::integer
          FROM public.messages unread
         WHERE unread.chat_room_id = cr.id
           AND unread.sender_id <> $1
           AND unread.read_at IS NULL) AS "unreadCount",
       EXISTS (
         SELECT 1 FROM public.blocks b
         WHERE (b.blocker_id = cr.buyer_id AND b.blocked_id = p.seller_id)
            OR (b.blocker_id = p.seller_id AND b.blocked_id = cr.buyer_id)
       ) AS blocked
     FROM public.chat_rooms cr
     JOIN public.products p ON p.id = cr.product_id
     JOIN public.users buyer ON buyer.id = cr.buyer_id
     JOIN public.users seller ON seller.id = p.seller_id
     LEFT JOIN LATERAL (
       SELECT m.content, m.sender_id, m.created_at
       FROM public.messages m
       WHERE m.chat_room_id = cr.id
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1
     ) last_message ON true
     WHERE cr.buyer_id = $1 OR p.seller_id = $1
     ORDER BY COALESCE(last_message.created_at, cr.created_at) DESC, cr.id DESC`,
    [userId],
  );
  return result.rows;
};

export const findChatRoom = async (
  roomId: string,
  userId: string,
): Promise<DatabaseRow | null> => {
  const result = await pool.query(
    `SELECT
       cr.id,
       cr.buyer_id AS "buyerId",
       p.seller_id AS "sellerId",
       p.id AS "productId",
       p.title AS "productTitle",
       p.price AS "productPrice",
       p.status AS "productStatus",
       (p.deleted_at IS NOT NULL) AS "productDeleted",
       CASE
         WHEN cr.buyer_id = $2 THEN seller.nickname
         ELSE buyer.nickname
       END AS "partnerNickname",
       CASE
         WHEN cr.buyer_id = $2 THEN p.seller_id
         ELSE cr.buyer_id
       END AS "partnerId",
       EXISTS (
         SELECT 1 FROM public.blocks b
         WHERE (b.blocker_id = cr.buyer_id AND b.blocked_id = p.seller_id)
            OR (b.blocker_id = p.seller_id AND b.blocked_id = cr.buyer_id)
       ) AS blocked
     FROM public.chat_rooms cr
     JOIN public.products p ON p.id = cr.product_id
     JOIN public.users buyer ON buyer.id = cr.buyer_id
     JOIN public.users seller ON seller.id = p.seller_id
     WHERE cr.id = $1`,
     [roomId, userId],
  );
  return result.rows[0] ?? null;
};
