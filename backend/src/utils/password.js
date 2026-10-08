import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// 회원가입 비밀번호를 DB에 저장할 bcrypt 해시로 바꾼다.
export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

// 로그인 비밀번호와 DB에 저장된 해시가 같은지 확인한다.
export const comparePassword = (password, passwordHash) =>
  bcrypt.compare(password, passwordHash);
