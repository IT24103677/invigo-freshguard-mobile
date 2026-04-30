export interface SaleAllocation {
  batchId: string;
  qtyDeducted: number;
  expiryDateSnapshot: string;
}

export interface SaleItem {
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  discountRateApplied: number;
  lineTotal: number;
  allocations: SaleAllocation[];
}

export interface Sale {
  _id: string;
  saleGroupId: string;
  recordedBy: string | null;
  status: "ACTIVE" | "VOID";
  notes: string | null;
  customerName: string | null;
  customerEmail: string | null;
  receiptImageUrl?: string | null;
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  amountGiven: number | null;
  changeGiven: number | null;
  items: SaleItem[];
  voidedBy: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  editedBy?: string | null;
  editedAt?: string | null;
  editReason?: string | null;
  saleDateTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
