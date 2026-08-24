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

  // Store the access token in memory and persist the refresh token.
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

    const res = await api.get("/api/auth/logout");

    return res.data;
  } catch (err) {
    console.error("Logout error:", err);
    throw err;
  } finally {
    tokenStore.clear();
  }
};