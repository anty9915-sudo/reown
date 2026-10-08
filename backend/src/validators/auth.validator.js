const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,20}$/;

const validateBody = (body, allowedFields) => {
  const details = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { body: '요청 본문은 JSON 객체여야 합니다.' };
  }

  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      details[field] = '정의되지 않은 필드입니다.';
    }
  }

  return details;
};

const validateEmail = (email, details) => {
  if (typeof email !== 'string') {
    details.email = '이메일은 문자열이어야 합니다.';
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 255) {
    details.email = '올바른 이메일을 입력해 주세요.';
  }
};

const validatePassword = (password, details) => {
  if (typeof password !== 'string') {
    details.password = '비밀번호는 문자열이어야 합니다.';
    return;
  }

  if (password.length < 8 || password.length > 20) {
    details.password = '비밀번호는 8자 이상 20자 이하여야 합니다.';
  }
};

export const validateSignup = (body) => {
  const details = validateBody(body, ['email', 'password', 'nickname']);

  validateEmail(body?.email, details);
  validatePassword(body?.password, details);

  if (typeof body?.nickname !== 'string') {
    details.nickname = '닉네임은 문자열이어야 합니다.';
  } else if (!NICKNAME_PATTERN.test(body.nickname)) {
    details.nickname = '닉네임은 한글, 영문, 숫자로 2자 이상 20자 이하여야 합니다.';
  }

  return details;
};

export const validateLogin = (body) => {
  const details = validateBody(body, ['email', 'password']);

  validateEmail(body?.email, details);
  validatePassword(body?.password, details);

  return details;
};
