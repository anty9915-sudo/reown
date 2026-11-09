import {
  createUser,
  findUserByEmail,
  findUserByNickname,
} from '../repositories/users.repository.js';
import AppError from '../utils/app-error.js';
import { createAccessToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import type {
  AuthCredentials,
  DatabaseRow,
  SignupInput,
} from '../types/domain.js';

interface PostgresError {
  code?: string;
  constraint?: string;
}

const isPostgresError = (error: unknown): error is PostgresError =>
  typeof error === 'object' && error !== null;

// DB 조회 결과에서 비밀번호 해시를 제외하고 API 응답 형태로 바꾼다.
const toPublicUser = (user: DatabaseRow) => ({
  id: String(user.id),
  email: user.email,
  nickname: user.nickname,
  regionId: user.regionId === null ? null : String(user.regionId),
});

const conflictError = (field: string, message: string): AppError =>
  new AppError(409, 'RESOURCE_CONFLICT', message, { [field]: message });

// 중복을 확인하고 비밀번호를 해시한 뒤 새 회원과 Access Token을 만든다.
export const signup = async ({
  email,
  password,
  nickname,
  regionId,
}: SignupInput) => {
  const normalizedEmail = email.trim().toLowerCase();
  const [emailUser, nicknameUser] = await Promise.all([
    findUserByEmail(normalizedEmail),
    findUserByNickname(nickname),
  ]);

  if (emailUser) {
    throw conflictError('email', '이미 사용 중인 이메일입니다.');
  }

  if (nicknameUser) {
    throw conflictError('nickname', '이미 사용 중인 닉네임입니다.');
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await createUser({
      email: normalizedEmail,
      passwordHash,
      nickname,
      regionId: regionId ?? null,
    });
  } catch (error) {
    if (
      isPostgresError(error) &&
      error.code === '23505' &&
      error.constraint === 'uq_users_email'
    ) {
      throw conflictError('email', '이미 사용 중인 이메일입니다.');
    }

    if (
      isPostgresError(error) &&
      error.code === '23505' &&
      error.constraint === 'uq_users_nickname'
    ) {
      throw conflictError('nickname', '이미 사용 중인 닉네임입니다.');
    }

    if (
      isPostgresError(error) &&
      error.code === '23503' &&
      error.constraint === 'fk_users_region'
    ) {
      throw new AppError(
        400,
        'INVALID_REGION',
        '선택한 동네를 찾을 수 없습니다. 다시 검색해 주세요.',
        { regionId: '동네 검색 결과에서 지역을 선택해 주세요.' },
      );
    }

    throw error;
  }

  return {
    accessToken: createAccessToken(user.id),
    user: toPublicUser(user),
  };
};

// 이메일과 비밀번호를 확인한 뒤 사용자 정보와 Access Token을 반환한다.
export const login = async ({ email, password }: AuthCredentials) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  const passwordMatches = user
    ? await comparePassword(password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    );
  }

  return {
    accessToken: createAccessToken(user.id),
    user: toPublicUser(user),
  };
};
