import axios from "axios";
import { Platform } from "react-native";

import { getAuthToken } from "../storage/token";

const API_BASE_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://10.164.210.177:5000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
