const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,20}$/;

type ValidationDetails = Record<string, string>;
type InputRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is InputRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateBody = (
  body: unknown,
  allowedFields: readonly string[],
): ValidationDetails => {
  const details: ValidationDetails = {};

  if (!isRecord(body)) {
    return { body: '요청 본문은 JSON 객체여야 합니다.' };
  }

  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      details[field] = '정의되지 않은 필드입니다.';
    }
  }

  return details;
};

const validateEmail = (email: unknown, details: ValidationDetails): void => {
  if (typeof email !== 'string') {
    details.email = '이메일은 문자열이어야 합니다.';
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 255) {
    details.email = '올바른 이메일을 입력해 주세요.';
  }
};

const validatePassword = (
  password: unknown,
  details: ValidationDetails,
): void => {
  if (typeof password !== 'string') {
    details.password = '비밀번호는 문자열이어야 합니다.';
    return;
  }

  if (password.length < 8 || password.length > 20) {
    details.password = '비밀번호는 8자 이상 20자 이하여야 합니다.';
  }
};

// 회원가입 요청에 필요한 이메일, 비밀번호, 닉네임을 검사한다.
export const validateSignup = (body: unknown): ValidationDetails => {
  const details = validateBody(body, ['email', 'password', 'nickname']);
  const input = isRecord(body) ? body : {};

  validateEmail(input.email, details);
  validatePassword(input.password, details);

  if (typeof input.nickname !== 'string') {
    details.nickname = '닉네임은 문자열이어야 합니다.';
  } else if (!NICKNAME_PATTERN.test(input.nickname)) {
    details.nickname = '닉네임은 한글, 영문, 숫자로 2자 이상 20자 이하여야 합니다.';
  }

  return details;
};

// 로그인 요청에 필요한 이메일과 비밀번호를 검사한다.
export const validateLogin = (body: unknown): ValidationDetails => {
  const details = validateBody(body, ['email', 'password']);
  const input = isRecord(body) ? body : {};

  validateEmail(input.email, details);
  validatePassword(input.password, details);

  return details;
};
