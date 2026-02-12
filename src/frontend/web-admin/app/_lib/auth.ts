const TOKEN_COOKIE = "macsync_token";

/** Read the JWT from the cookie (client-side only). */
export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Persist a JWT in a cookie (7-day expiry, accessible to middleware). */
export function setToken(token: string): void {
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Remove the JWT cookie (used on logout). */
export function clearToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
}
