import React, { createContext, useContext, useState } from 'react';

const PosCartContext = createContext(null);

function buildCheckoutDraft() {
  return {
    amountGiven: '',
    customerName: '',
    customerEmail: '',
    notes: '',
    receiptAsset: null,
  };
}

function buildCartItem(product) {
  return {
    productId: product._id || product.id,
    productName: product.name,
    category: product.category,
    imageUrl: product.imageUrl || '',
    unitPrice: Number(product.sellingPrice || 0),
    quantity: 1,
    discountRate: 0,
  };
}

export function PosCartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [checkoutDraft, setCheckoutDraftState] = useState(buildCheckoutDraft());

  function addProduct(product) {
    const productId = product._id || product.id;
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) {
        return current.map((item) => (
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
      return [...current, buildCartItem(product)];
    });
  }

  function incrementProduct(product) {
    addProduct(product);
  }

  function decrementProduct(productId) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (!existing) return current;
      if (existing.quantity <= 1) {
        return current.filter((item) => item.productId !== productId);
      }
      return current.map((item) => (
        item.productId === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    });
  }

  function updateQuantity(productId, delta) {
    setCart((current) => current
      .map((item) => (
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      ))
      .filter((item) => item.quantity > 0));
  }

  function updateDiscount(productId, rate) {
    const safeRate = Math.min(100, Math.max(0, Number(rate || 0)));
    setCart((current) => current.map((item) => (
      item.productId === productId
        ? { ...item, discountRate: safeRate }
        : item
    )));
  }

  function removeProduct(productId) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  function setCheckoutDraft(draft) {
    setCheckoutDraftState((current) => ({ ...current, ...draft }));
  }

  function resetCheckoutDraft() {
    setCheckoutDraftState(buildCheckoutDraft());
  }

  function clearCart() {
    setCart([]);
  }

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
    <PosCartContext.Provider value={value}>
      {children}
    </PosCartContext.Provider>
  );
}

export function usePosCart() {
  const context = useContext(PosCartContext);
  if (!context) {
    throw new Error('usePosCart must be used within a PosCartProvider.');
  }
  return context;
}
