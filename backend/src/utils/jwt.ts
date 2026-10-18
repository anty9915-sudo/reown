import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import env from '../config/env.js';

export const createAccessToken = (userId: string | number): string =>
  // 사용자 ID와 만료 시간을 담은 Access Token을 만든다.
  jwt.sign({ userId: String(userId) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });

// 회원가입·로그인 응답용으로 토큰과 실제 만료 시간(exp - iat, 초)을 함께 만든다 (결정 25).
export const issueAccessToken = (
  userId: string | number,
): { accessToken: string; expiresIn: number } => {
  const accessToken = createAccessToken(userId);
  const payload = jwt.decode(accessToken);

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.exp !== 'number' ||
    typeof payload.iat !== 'number'
  ) {
    throw new Error('발급한 Access Token에 exp 또는 iat가 없습니다.');
  }

  return { accessToken, expiresIn: payload.exp - payload.iat };
};

// 요청으로 받은 Access Token의 서명과 만료 시간을 확인한다.
export const verifyAccessToken = (token: string) => jwt.verify(token, env.jwtSecret);
