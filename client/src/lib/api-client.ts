import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("ecosphere_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(err) && err.response?.data?.error) {
    return err.response.data.error.message;
  }
  return "Something went wrong. Please try again.";
}

export function getApiFieldErrors(err: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(err) && err.response?.data?.error?.fields) {
    return err.response.data.error.fields;
  }
  return {};
}
