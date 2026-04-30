import { apiClient } from "./client";
import { ApiResponse, Sale } from "../types/sale";
import type { ImagePickerAsset } from "expo-image-picker";

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

interface UpdateSaleInput {
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  editReason: string;
}

interface GetSalesParams {
  status?: "ACTIVE" | "VOID";
  from?: string;
  to?: string;
}

export const getSales = async (params?: GetSalesParams) => {
  const response = await apiClient.get<ApiResponse<Sale[]>>("/sales", { params });
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

export const updateSale = async (saleId: string, payload: UpdateSaleInput) => {
  const response = await apiClient.put<ApiResponse<Sale>>(`/sales/${saleId}`, payload);
  return response.data.data;
};

export const voidSale = async (saleId: string, voidReason: string) => {
  const response = await apiClient.post<ApiResponse<Sale>>(
    `/sales/${saleId}/void`,
    { voidReason }
  );
  return response.data.data;
};

export const uploadSaleReceipt = async (
  saleId: string,
  asset: ImagePickerAsset
) => {
  const formData = new FormData();
  formData.append("receipt", {
    uri: asset.uri,
    name: asset.fileName ?? `receipt-${Date.now()}.jpg`,
    type: asset.mimeType ?? "image/jpeg",
  } as unknown as Blob);

  const response = await apiClient.post<ApiResponse<Sale>>(
    `/sales/${saleId}/receipt`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.data;
};
