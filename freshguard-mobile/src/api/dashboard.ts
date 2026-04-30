import { getSales } from "./sales";
import { Sale } from "../types/sale";

export interface DashboardSummary {
  todaysRevenue: number;
  todaysActiveBills: number;
  todaysUnitsSold: number;
  voidedSalesCount: number;
  latestActiveSale: Sale | null;
}

function isSameDay(dateStr: string, now: Date) {
  const date = new Date(dateStr);

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const sales = await getSales();
  const now = new Date();

  const activeSales = sales.filter((sale) => sale.status === "ACTIVE");
  const todaysActiveSales = activeSales.filter((sale) =>
    isSameDay(sale.saleDateTime, now)
  );
  const latestActiveSale =
    [...activeSales].sort(
      (a, b) =>
        new Date(b.saleDateTime).getTime() - new Date(a.saleDateTime).getTime()
    )[0] ?? null;

  return {
    todaysRevenue: todaysActiveSales.reduce(
      (sum, sale) => sum + sale.grandTotal,
      0
    ),
    todaysActiveBills: todaysActiveSales.length,
    todaysUnitsSold: todaysActiveSales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0),
      0
    ),
    voidedSalesCount: sales.filter((sale) => sale.status === "VOID").length,
    latestActiveSale,
  };
};
