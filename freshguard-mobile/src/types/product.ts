export interface Product {
  _id: string;
  name: string;
  category: string;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  supplier?: string | null;
  unitType: string;
  buyingPrice: number;
  sellingPrice: number;
  imageUrl?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
