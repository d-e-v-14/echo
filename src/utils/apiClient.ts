import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      const currentUrl =
        window.location.pathname + window.location.search;

      localStorage.setItem("redirectAfterLogin", currentUrl);

      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);