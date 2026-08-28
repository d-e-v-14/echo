const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";
const STALE_ACCESS_KEYS = ["access_token", "token", "tokenExpiry"];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

let accessToken: string | null = null;
let accessTokenExpiry: number | null = null;
let refreshInFlight: Promise<boolean> | null = null;

const canUseStorage = () => typeof window !== "undefined";

function removeStaleAccessKeys() {
  if (!canUseStorage()) return;
  for (const key of STALE_ACCESS_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export interface TokenBundle {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },

  getAccessTokenExpiry(): number | null {
    return accessTokenExpiry;
  },

  hasRefreshToken(): boolean {
    return canUseStorage() && !!window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return canUseStorage() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  },

  setTokens(tokens: TokenBundle) {
    accessToken = tokens.accessToken;
    accessTokenExpiry = tokens.expiresIn
      ? Date.now() + tokens.expiresIn * 1000
      : null;
    if (canUseStorage() && tokens.refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    removeStaleAccessKeys();
  },

  setUser(user: unknown) {
    if (canUseStorage()) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getUser(): unknown {
    if (!canUseStorage()) return null;
    const stored = window.localStorage.getItem(USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  async ensureAccessToken(): Promise<string | null> {
    if (
      accessToken &&
      accessTokenExpiry &&
      Date.now() < accessTokenExpiry - REFRESH_BUFFER_MS
    ) {
      return accessToken;
    }
    const ok = await this.refresh();
    return ok ? accessToken : null;
  },

  refresh(): Promise<boolean> {
    if (!refreshInFlight) {
      refreshInFlight = this.doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  },

  async attemptRefresh(token: string | null): Promise<TokenBundle | null> {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { refreshToken: token } : {}),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data.accessToken) {
        return null;
      }

      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
      };
    } catch {
      return null;
    }
  },

  async doRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();

    if (refreshToken) {
      const bundle = await this.attemptRefresh(refreshToken);
      if (bundle) {
        this.setTokens(bundle);
        return true;
      }
    }

    // Stored refresh token may be stale (the web server rotates the httpOnly
    // refresh cookie on its own). Fall back to the cookie session so a
    // middleware-driven rotation doesn't log the user out. For web this also
    // covers the reload case where localStorage was cleared but the cookie
    // session is still valid.
    const cookieBundle = await this.attemptRefresh(null);
    if (cookieBundle) {
      this.setTokens(cookieBundle);
      return true;
    }

    this.clear();
    return false;
  },

  clear() {
    accessToken = null;
    accessTokenExpiry = null;
    if (canUseStorage()) {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      removeStaleAccessKeys();
    }
  },
};