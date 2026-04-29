import { apiClient } from "./client";
import { saveAuthToken } from "../storage/token";
import { ApiResponse, AuthPayload, AuthUser } from "../types/auth";

interface LoginRequest {
  email: string;
  password: string;
}

export const loginUser = async ({ email, password }: LoginRequest) => {
  const response = await apiClient.post<ApiResponse<AuthPayload>>("/auth/login", {
    email,
    password,
  });

  const payload = response.data.data;
  await saveAuthToken(payload.token);

  return payload;
};

export const getCurrentUser = async () => {
  const response = await apiClient.get<ApiResponse<{ user: AuthUser }>>("/auth/me");
  return response.data.data.user;
};
