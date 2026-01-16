import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

let isRefreshing = false;
let inMemoryAccessToken: string | null = null;

let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token?: string) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (typeof window === "undefined" || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/api/auth/refresh")) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (!token) throw new Error("No token after refresh");
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshTokenValue = localStorage.getItem("refresh_token");
      if (!refreshTokenValue) {
        throw new Error("No refresh token available");
      }

      const response = await api.post(
        "/api/auth/refresh",
        { refreshToken: refreshTokenValue },
        { headers: { Authorization: "" } }
      );

      const { accessToken, refreshToken: newRefreshToken, expiresIn } =
        response.data;

      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", newRefreshToken);

      const expiryTime = Date.now() + expiresIn * 1000;
      localStorage.setItem("tokenExpiry", expiryTime.toString());

      inMemoryAccessToken = accessToken;
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as Error);

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("tokenExpiry");
      localStorage.removeItem("user");

      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export function getToken(token?: string) {
  inMemoryAccessToken = token ?? null;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export const refreshToken = async (): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> => {
  try {
    const refreshTokenValue = localStorage.getItem("refresh_token");
    if (!refreshTokenValue) {
      throw new Error("No refresh token available");
    }

    const response = await api.post(
      "/api/auth/refresh",
      { refreshToken: refreshTokenValue },
      { headers: { Authorization: "" } }
    );

    const { accessToken, refreshToken: newRefreshToken, expiresIn } =
      response.data;

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", newRefreshToken);

    const expiryTime = Date.now() + expiresIn * 1000;
    localStorage.setItem("tokenExpiry", expiryTime.toString());

    inMemoryAccessToken = accessToken;
    api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    return { accessToken, refreshToken: newRefreshToken, expiresIn };
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

if (typeof window !== "undefined") {
  const storedToken = localStorage.getItem("access_token");
  if (storedToken) {
    getToken(storedToken);
  }
}
