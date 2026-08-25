import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenStore } from "@/lib/auth/tokenStore";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const apiClient = api;

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const accessToken = tokenStore.getAccessToken();
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const redirectToHome = () => {
  sessionStorage.setItem("skipGlobalLoader", "1");
  if (!window.location.pathname.startsWith("/invite")) {
    window.location.href = "/";
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (typeof window === "undefined" || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (
      originalRequest._retry ||
      originalRequest.url?.includes("/api/auth/refresh")
    ) {
      tokenStore.clear();
      redirectToHome();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshed = await tokenStore.refresh();

    if (refreshed) {
      const token = tokenStore.getAccessToken();
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${token}`;
      }
      return api(originalRequest);
    }

    tokenStore.clear();
    redirectToHome();
    return Promise.reject(error);
  }
);

export function getToken(token?: string) {
  if (token) {
    tokenStore.setTokens({ accessToken: token });
  } else {
    tokenStore.clear();
  }
}

export const refreshToken = async (): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> => {
  const ok = await tokenStore.refresh();
  if (!ok) return null;
  return {
    accessToken: tokenStore.getAccessToken() ?? "",
    refreshToken: tokenStore.getRefreshToken() ?? "",
    expiresIn: 0,
  };
};