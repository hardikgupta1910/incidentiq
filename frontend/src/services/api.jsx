import axios from "axios";

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL;

if (!configuredBaseURL) {
  throw new Error(
    "VITE_API_BASE_URL is missing. Set it in frontend/.env and restart Vite."
  );
}

const api = axios.create({
  baseURL: configuredBaseURL.replace(/\/+$/, ""),
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
});

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

api.interceptors.request.use((config) => {
  if (accessToken && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export function getApiErrorMessage(error) {
  if (axios.isCancel(error)) {
    return "The request was cancelled.";
  }

  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item.loc)
          ? item.loc
              .filter((part) => !["body", "query", "path"].includes(part))
              .join(".")
          : "";

        const message = item.msg || "Invalid value";

        return field ? `${field}: ${message}` : message;
      })
      .join("; ");
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Check the backend and try again.";
  }

  if (!error?.response) {
    return "Unable to reach the API. Check that the backend is running and that the API URL and CORS configuration are correct.";
  }

  switch (error.response.status) {
    case 401:
      return "Authentication is required. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This request conflicts with an existing resource.";
    case 429:
      return "Too many requests. Please try again shortly.";
    default:
      return "The request failed. Please try again.";
  }
}

export default api;