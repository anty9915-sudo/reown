import AppError from '../utils/app-error.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Authorization 헤더의 JWT를 확인하고 현재 사용자 ID를 req.user에 저장한다.
const authenticate = (req, res, next) => {
  const authorization = req.get('Authorization');

  if (!authorization) {
    return next(
      new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        '인증 토큰이 필요합니다.',
      ),
    );
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme !== 'Bearer' || !token || extra) {
    return next(
      new AppError(401, 'INVALID_TOKEN', '인증 토큰이 올바르지 않습니다.'),
    );
  }

  try {
    const payload = verifyAccessToken(token);

    if (
      typeof payload !== 'object' ||
      typeof payload.userId !== 'string' ||
      !/^[1-9]\d*$/.test(payload.userId)
    ) {
      throw new Error('JWT에 올바른 사용자 ID가 없습니다.');
    }

    req.user = { id: payload.userId };
    return next();
  } catch {
    return next(
      new AppError(
        401,
        'INVALID_TOKEN',
        '인증 토큰이 잘못되었거나 만료되었습니다.',
      ),
    );
  }
};

export default authenticate;
