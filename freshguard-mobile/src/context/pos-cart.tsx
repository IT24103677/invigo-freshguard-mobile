import React, { createContext, useContext, useState } from "react";
import type { ImagePickerAsset } from "expo-image-picker";

import { Product } from "../types/product";
import { CartLineItem } from "@/components/ui/cart-item";

interface CheckoutDraft {
  amountGiven: string;
  customerName: string;
  customerEmail: string;
  notes: string;
  receiptAsset: ImagePickerAsset | null;
}

interface PosCartContextValue {
  cart: CartLineItem[];
  checkoutDraft: CheckoutDraft;
  addProduct: (product: Product) => void;
  incrementProduct: (product: Product) => void;
  decrementProduct: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  updateDiscount: (productId: string, rate: number) => void;
  removeProduct: (productId: string) => void;
  setCheckoutDraft: (draft: Partial<CheckoutDraft>) => void;
  resetCheckoutDraft: () => void;
  clearCart: () => void;
}

const PosCartContext = createContext<PosCartContextValue | undefined>(undefined);

function buildCartItem(product: Product): CartLineItem {
  return {
    productId: product._id,
    productName: product.name,
    category: product.category,
    imageUrl: product.imageUrl,
    unitPrice: product.sellingPrice,
    quantity: 1,
    discountRate: 0,
  };
}

function buildCheckoutDraft(): CheckoutDraft {
  return {
    amountGiven: "",
    customerName: "",
    customerEmail: "",
    notes: "",
    receiptAsset: null,
  };
}

export function PosCartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [checkoutDraft, setCheckoutDraftState] = useState<CheckoutDraft>(
    buildCheckoutDraft()
  );

  const addProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);

      if (existing) {
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prev, buildCartItem(product)];
    });
  };

  const incrementProduct = (product: Product) => {
    addProduct(product);
  };

  const decrementProduct = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);

      if (!existing) return prev;

      if (existing.quantity <= 1) {
        return prev.filter((item) => item.productId !== productId);
      }

      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const updateDiscount = (productId: string, rate: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, discountRate: rate } : item
      )
    );
  };

  const removeProduct = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const setCheckoutDraft = (draft: Partial<CheckoutDraft>) => {
    setCheckoutDraftState((current) => ({ ...current, ...draft }));
  };

  const resetCheckoutDraft = () => {
    setCheckoutDraftState(buildCheckoutDraft());
  };

  const clearCart = () => {
    setCart([]);
  };

  const value = {
    cart,
    checkoutDraft,
    addProduct,
    incrementProduct,
    decrementProduct,
    updateQuantity,
    updateDiscount,
    removeProduct,
    setCheckoutDraft,
    resetCheckoutDraft,
    clearCart,
  };

  return (
    <PosCartContext.Provider value={value}>{children}</PosCartContext.Provider>
  );
}

export function usePosCart() {
  const context = useContext(PosCartContext);

  if (!context) {
    throw new Error("usePosCart must be used within a PosCartProvider.");
  }

  return context;
}
