export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  regionId: string | null;
  regionName: string | null;
  role?: "user" | "admin";
};

export const ACCESS_TOKEN_KEY = "reown-access-token";
export const AUTH_USER_KEY = "reown-auth-user";

export function getAccessToken(): string {
  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
    ""
  );
}

export function getAuthUser(): AuthUser | null {
  const raw =
    window.localStorage.getItem(AUTH_USER_KEY) ??
    window.sessionStorage.getItem(AUTH_USER_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveAuth(
  accessToken: string,
  user: AuthUser,
  rememberLogin: boolean,
): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.sessionStorage.removeItem(AUTH_USER_KEY);

  const storage = rememberLogin ? window.localStorage : window.sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.sessionStorage.removeItem(AUTH_USER_KEY);
}
