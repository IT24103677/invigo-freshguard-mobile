import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { getAuthToken } from "../storage/token";

interface ExpoExtraConfig {
  apiBaseUrlWeb?: string;
  apiBaseUrlNative?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtraConfig;

const API_BASE_URL =
  Platform.OS === "web"
    ? extra.apiBaseUrlWeb ?? "http://localhost:5000"
    : extra.apiBaseUrlNative ?? "http://10.164.210.177:5000";

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
