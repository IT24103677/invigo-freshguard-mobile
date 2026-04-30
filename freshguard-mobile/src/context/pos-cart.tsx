import React, { createContext, useContext, useState } from "react";

import { Product } from "../types/product";
import { CartLineItem } from "@/components/ui/cart-item";

interface PosCartContextValue {
  cart: CartLineItem[];
  addProduct: (product: Product) => void;
  incrementProduct: (product: Product) => void;
  decrementProduct: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  updateDiscount: (productId: string, rate: number) => void;
  removeProduct: (productId: string) => void;
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

export function PosCartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLineItem[]>([]);

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

  const clearCart = () => {
    setCart([]);
  };

  const value = {
    cart,
    addProduct,
    incrementProduct,
    decrementProduct,
    updateQuantity,
    updateDiscount,
    removeProduct,
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
