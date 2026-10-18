import { findRegionById } from '../repositories/regions.repository.js';
import {
  createUser,
  findUserByEmail,
  findUserByNickname,
} from '../repositories/users.repository.js';
import AppError from '../utils/app-error.js';
import { issueAccessToken } from '../utils/jwt.js';
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

interface RegionName {
  id: string;
  sido: string;
  sigungu: string | null;
  eupmyeondong: string;
}

const isPostgresError = (error: unknown): error is PostgresError =>
  typeof error === 'object' && error !== null;

// 비밀번호 해시를 제외한 인증 결과의 user 객체를 만든다.
const toAuthUser = (user: DatabaseRow, region: RegionName | null) => ({
  id: String(user.id),
  email: user.email,
  nickname: user.nickname,
  region,
});

const toRegionName = (region: DatabaseRow): RegionName => ({
  id: String(region.id),
  sido: region.sido,
  sigungu: region.sigungu,
  eupmyeondong: region.eupmyeondong,
});

// 로그인 조회 결과의 지역 컬럼을 RegionName으로 바꾼다. 지역이 없는 회원은 null이다 (결정 24).
const toLoginRegion = (user: DatabaseRow): RegionName | null =>
  user.regionId === null
    ? null
    : {
        id: String(user.regionId),
        sido: user.regionSido,
        sigungu: user.regionSigungu,
        eupmyeondong: user.regionEupmyeondong,
      };

const conflictError = (field: string, message: string): AppError =>
  new AppError(409, 'RESOURCE_CONFLICT', message, { [field]: message });

const invalidRegionError = (): AppError =>
  new AppError(400, 'VALIDATION_ERROR', '입력값이 올바르지 않습니다.', {
    regionId: '존재하지 않는 지역입니다.',
  });

// 지역 ID로 지역을 조회한다. bigint 범위를 넘는 ID(22003)도 존재하지 않는 지역으로 본다.
const findSignupRegion = async (regionId: string): Promise<DatabaseRow | null> => {
  try {
    return await findRegionById(regionId);
  } catch (error) {
    if (isPostgresError(error) && error.code === '22003') {
      return null;
    }
    throw error;
  }
};

// 지역·중복을 확인하고 비밀번호를 해시한 뒤 새 회원과 Access Token을 만든다.
export const signup = async ({ email, password, nickname, regionId }: SignupInput) => {
  const normalizedEmail = email.trim().toLowerCase();
  const [region, emailUser, nicknameUser] = await Promise.all([
    findSignupRegion(regionId),
    findUserByEmail(normalizedEmail),
    findUserByNickname(nickname),
  ]);

  if (!region) {
    throw invalidRegionError();
  }

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
      regionId: String(region.id),
    });
  } catch (error) {
    if (
      isPostgresError(error) &&
      error.code === '23503' &&
      error.constraint === 'fk_users_region'
    ) {
      throw invalidRegionError();
    }

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

    throw error;
  }

  return {
    ...issueAccessToken(user.id),
    user: toAuthUser(user, toRegionName(region)),
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
    ...issueAccessToken(user.id),
    user: toAuthUser(user, toLoginRegion(user)),
  };
};
