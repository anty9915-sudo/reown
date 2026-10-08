import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const createAccessToken = (userId) =>
  // 사용자 ID와 만료 시간을 담은 Access Token을 만든다.
  jwt.sign({ userId: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

// 요청으로 받은 Access Token의 서명과 만료 시간을 확인한다.
export const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
