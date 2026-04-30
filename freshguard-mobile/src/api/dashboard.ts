import { apiClient } from "./client";
import { ApiResponse, Sale } from "../types/sale";

export interface DashboardSummary {
  todaysRevenue: number;
  todaysActiveBills: number;
  todaysUnitsSold: number;
  voidedSalesCount: number;
  latestActiveSale: Sale | null;
}

interface DashboardSummaryParams {
  from?: string;
  to?: string;
}

export const getDashboardSummary = async (
  params?: DashboardSummaryParams
): Promise<DashboardSummary> => {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>(
    "/dashboard/summary",
    { params }
  );
  return response.data.data;
};
