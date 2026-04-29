import { apiClient } from "./client";
import { ApiResponse } from "../types/auth";
import { Product } from "../types/product";

export const getProducts = async () => {
  const response = await apiClient.get<ApiResponse<Product[]>>("/products");
  return response.data.data;
};
