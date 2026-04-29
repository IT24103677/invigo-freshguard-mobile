import { apiClient } from "./client";
import { ApiResponse, Sale } from "../types/sale";

interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  discountRateApplied?: number;
}

interface CreateSaleInput {
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  amountGiven?: number;
  items: CreateSaleItemInput[];
}

export const getSales = async () => {
  const response = await apiClient.get<ApiResponse<Sale[]>>("/sales");
  return response.data.data;
};

export const getSaleById = async (saleId: string) => {
  const response = await apiClient.get<ApiResponse<Sale>>(`/sales/${saleId}`);
  return response.data.data;
};

export const createSale = async (payload: CreateSaleInput) => {
  const response = await apiClient.post<ApiResponse<Sale>>("/sales", payload);
  return response.data.data;
};

export const voidSale = async (saleId: string, voidReason: string) => {
  const response = await apiClient.post<ApiResponse<Sale>>(
    `/sales/${saleId}/void`,
    { voidReason }
  );
  return response.data.data;
};
