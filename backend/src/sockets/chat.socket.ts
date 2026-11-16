import type { Server, Socket } from 'socket.io';
import * as chatsService from '../services/chats.service.js';
import AppError from '../utils/app-error.js';

const EVENTS = {
  join: 'chat:join',
  leave: 'chat:leave',
  send: 'chat:send',
  read: 'chat:read',
  message: 'chat:message',
} as const;

const ROOM_ID_PATTERN = /^[1-9]\d*$/;
type ChatAck<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };
type ChatFailure = Extract<ChatAck, { ok: false }>;

type Message = Awaited<ReturnType<typeof chatsService.sendMessage>>;

const failure = (error: unknown): ChatFailure => {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message };
  }

  console.error(error);
  return {
    ok: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: '채팅 요청을 처리하지 못했습니다.',
  };
};

const invalidRoomId = () =>
  new AppError(400, 'VALIDATION_ERROR', '채팅방 ID가 올바르지 않습니다.');

const registerChatHandlers = (io: Server, socket: Socket): void => {
  const userId = socket.data.userId;
  if (typeof userId !== 'string') {
    socket.disconnect(true);
    return;
  }

  socket.on(
    EVENTS.join,
    async (
      payload: { roomId?: unknown },
      acknowledge?: (result: ChatAck) => void,
    ) => {
      try {
        if (typeof payload?.roomId !== 'string' || !ROOM_ID_PATTERN.test(payload.roomId)) {
          throw invalidRoomId();
        }
        await chatsService.getChatRoom(payload.roomId, userId);
        await socket.join(`chat:${payload.roomId}`);
        acknowledge?.({ ok: true });
      } catch (error) {
        acknowledge?.(failure(error));
      }
    },
  );

  socket.on(EVENTS.leave, (payload: { roomId?: unknown }) => {
    if (typeof payload?.roomId === 'string' && ROOM_ID_PATTERN.test(payload.roomId)) {
      void socket.leave(`chat:${payload.roomId}`);
    }
  });

  socket.on(
    EVENTS.send,
    async (
      payload: { roomId?: unknown; content?: unknown },
      acknowledge?: (result: ChatAck<{ message: Message }>) => void,
    ) => {
      try {
        if (typeof payload?.roomId !== 'string' || !ROOM_ID_PATTERN.test(payload.roomId)) {
          throw invalidRoomId();
        }
        const message = await chatsService.sendMessage(
          payload.roomId,
          userId,
          payload.content,
        );
        io.to(`chat:${payload.roomId}`).emit(EVENTS.message, message);
        acknowledge?.({ ok: true, message });
      } catch (error) {
        acknowledge?.(failure(error));
      }
    },
  );

  socket.on(
    EVENTS.read,
    async (
      payload: { roomId?: unknown },
      acknowledge?: (result: ChatAck) => void,
    ) => {
      try {
        if (typeof payload?.roomId !== 'string' || !ROOM_ID_PATTERN.test(payload.roomId)) {
          throw invalidRoomId();
        }
        const readAt = await chatsService.markRead(payload.roomId, userId);
        if (readAt) {
          io.to(`chat:${payload.roomId}`).emit(EVENTS.read, {
            roomId: payload.roomId,
            readerId: userId,
            readAt,
          });
        }
        acknowledge?.({ ok: true });
      } catch (error) {
        acknowledge?.(failure(error));
      }
    },
  );
};

export default registerChatHandlers;
