import { api, getToken } from "./axios";

export interface profile {
  id: string;
  email: string;
  username: string;
  fullname: string;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth: string;
  status: string;
  created_at: string;
}

export const fetchProfile = async (): Promise<profile> => {
  if (typeof window === "undefined") {
    throw new Error("Client only");
  }

  const res = await api.get("/api/profile/getProfile");
  return res.data.user;
};

export const register = async (
  email: string,
  username: string,
  password: string
) => {
  const res = await api.post("/api/auth/register", {
    email,
    username,
    password,
  });
  return res.data;
};

export const login = async (identifier: string, password: string) => {
  const res = await api.post("/api/auth/login", { identifier, password });

  const { accessToken, refreshToken, expiresIn, user } = res.data;

  if (accessToken) {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);

    const expiryTime = Date.now() + expiresIn * 1000;
    localStorage.setItem("tokenExpiry", expiryTime.toString());

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    getToken(accessToken);
  }

  return res.data;
};

export const handleOAuthLogin = async (accessToken: string) => {
  const res = await api.post(
    "/api/auth/oauth-user",
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const { accessToken: newAccessToken, refreshToken, expiresIn, user } =
    res.data;

  if (newAccessToken) {
    localStorage.setItem("access_token", newAccessToken);
    localStorage.setItem("refresh_token", refreshToken);

    const expiryTime = Date.now() + expiresIn * 1000;
    localStorage.setItem("tokenExpiry", expiryTime.toString());

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    getToken(newAccessToken);
  }

  return res.data;
};

export const forgotPassword = async (email: string) => {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
};

export const resetPassword = async (
  newPassword: string,
  accessToken: string
) => {
  const res = await api.post(
    "/api/auth/reset-password",
    { new_password: newPassword },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data;
};

export const logout = async () => {
  try {
    await api.post("/api/auth/logout");

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("user");

    getToken(undefined);

    return true;
  } catch (err) {
    console.error("Logout error:", err);
    throw err;
  }
};

export const getUser = async (): Promise<profile | null> => {
  if (typeof window === "undefined") return null;

  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  return JSON.parse(storedUser) as profile;
};
