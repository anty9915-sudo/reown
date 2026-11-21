import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
dotenv.config({ path: envPath, quiet: true });

const required = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }

  return value;
};

const port = Number(process.env.PORT || 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT는 1부터 65535 사이의 정수여야 합니다.');
}

const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const configuredJwtSecret = process.env.JWT_SECRET?.trim();
const jwtSecret =
  configuredJwtSecret || randomBytes(48).toString('base64url');

if (
  configuredJwtSecret &&
  Buffer.byteLength(configuredJwtSecret, 'utf8') < 32
) {
  throw new Error('JWT_SECRET은 32바이트 이상이어야 합니다.');
}

const env = {
  port,
  databaseUrl: process.env.DATABASE_URL?.trim() || null,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '2h',
  frontendUrls,
};

export default env;
