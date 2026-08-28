import { api } from "./axios";
import { tokenStore } from "@/lib/auth/tokenStore";

export const register = async (
  email: string,
  username: string,
  password: string
) => {
  const response = await api.post("/api/auth/register", {
    email,
    username,
    password,
  });
  return response.data;
};

export const login = async (identifier: string, password: string) => {
  const response = await api.post("/api/auth/login", { identifier, password });

  if (response.data.accessToken) {
    tokenStore.setTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresIn: response.data.expiresIn,
    });

    if (response.data.user) {
      tokenStore.setUser(response.data.user);
    }
  }

  return response.data;
};

export const handleOAuthLogin = async (
  accessToken: string,
  refreshToken?: string
) => {
  const response = await api.post(
    "/api/auth/oauth-user",
    { refreshToken }, // Send refresh token in body for backend to set cookie
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (response.data.accessToken) {
    tokenStore.setTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken ?? refreshToken,
      expiresIn: response.data.expiresIn,
    });
    if (response.data.user) {
      tokenStore.setUser(response.data.user);
    }
  }

  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post("/api/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (
  newPassword: string,
  accessToken: string
) => {
  const response = await api.post(
    "/api/auth/reset-password",
    { new_password: newPassword },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
};

export const logout = async () => {
  try {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("skipGlobalLoader", "1");
    }

    // Backend revokes the server-side session on logout, so the access token
    // must travel with the request (Bearer header via interceptor, body fallback,
    // or the httpOnly access cookie for web).
    const res = await api.post("/api/auth/logout", {
      accessToken: tokenStore.getAccessToken() ?? undefined,
    });

    return res.data;
  } catch (err: unknown) {
    // 400 = session already gone server-side; 429 = auth endpoint rate-limited.
    // Either way the local logout still succeeds (state is cleared in finally).
    if (
      err &&
      typeof err === "object" &&
      "response" in err &&
      typeof (err as { response?: { status?: number } }).response?.status ===
        "number" &&
      [400, 429].includes(
        (err as { response: { status: number } }).response.status
      )
    ) {
      return { message: "Logged out successfully" };
    }
    console.error("Logout error:", err);
    throw err;
  } finally {
    tokenStore.clear();
  }
};