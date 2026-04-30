import { apiClient } from "./client";
import { ApiResponse, Sale } from "../types/sale";

export interface DashboardSummary {
  todaysRevenue: number;
  todaysActiveBills: number;
  todaysUnitsSold: number;
  voidedSalesCount: number;
  latestActiveSale: Sale | null;
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>(
    "/dashboard/summary"
  );
  return response.data.data;
};
