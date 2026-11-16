import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';

const USER_ID_PATTERN = /^[1-9]\d*$/;
type SocketNext = (error?: Error) => void;

export const authenticateSocket = (
  socket: Socket,
  next: SocketNext,
): void => {
  const token = socket.handshake.auth.token;
  if (typeof token !== 'string' || token.length === 0) {
    next(new Error('인증 토큰이 필요합니다.'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    if (
      typeof payload !== 'object' ||
      typeof payload.userId !== 'string' ||
      !USER_ID_PATTERN.test(payload.userId)
    ) {
      next(new Error('인증 토큰이 올바르지 않습니다.'));
      return;
    }

    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('인증 토큰이 잘못되었거나 만료되었습니다.'));
  }
};
