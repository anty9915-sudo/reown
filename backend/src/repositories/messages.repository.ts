import pool from '../config/database.js';
import type { DatabaseRow } from '../types/domain.js';

export const findMessages = async (roomId: string): Promise<DatabaseRow[]> => {
  const result = await pool.query(
    `SELECT
       id,
       chat_room_id AS "chatRoomId",
       sender_id AS "senderId",
       content,
       read_at AS "readAt",
       created_at AS "createdAt"
     FROM public.messages
     WHERE chat_room_id = $1
     ORDER BY created_at ASC, id ASC`,
    [roomId],
  );
  return result.rows;
};

export const createMessage = async (
  roomId: string,
  senderId: string,
  content: string,
): Promise<DatabaseRow> => {
  const result = await pool.query(
    `INSERT INTO public.messages (chat_room_id, sender_id, content)
     VALUES ($1, $2, $3)
     RETURNING
       id,
       chat_room_id AS "chatRoomId",
       sender_id AS "senderId",
       content,
       read_at AS "readAt",
       created_at AS "createdAt"`,
    [roomId, senderId, content],
  );
  return result.rows[0];
};

export const markMessagesRead = async (
  roomId: string,
  readerId: string,
): Promise<string | null> => {
  const result = await pool.query(
    `UPDATE public.messages
     SET read_at = now()
     WHERE chat_room_id = $1
       AND sender_id <> $2
       AND read_at IS NULL
     RETURNING read_at AS "readAt"`,
    [roomId, readerId],
  );
  return result.rows[0] ? new Date(result.rows[0].readAt).toISOString() : null;
};
