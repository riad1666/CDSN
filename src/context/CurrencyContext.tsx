"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Currency = "KRW" | "USD" | "EUR" | "BDT";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (amount: number) => string;
  convertPrice: (amount: number) => number;
}

const EXCHANGE_RATES: Record<Currency, number> = {
  KRW: 1,
  USD: 0.00075, // 1 KRW = 0.00075 USD
  EUR: 0.00070, // 1 KRW = 0.00070 EUR
  BDT: 0.082,   // 1 KRW = 0.082 BDT
};

const SYMBOLS: Record<Currency, string> = {
  KRW: "₩",
  USD: "$",
  EUR: "€",
  BDT: "৳",
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("KRW");

  useEffect(() => {
    const saved = localStorage.getItem("cdsn-currency") as Currency;
    if (saved) setCurrency(saved);
  }, []);

  const handleSetCurrency = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem("cdsn-currency", c);
  };

  const convertPrice = (amount: number) => {
    return amount * EXCHANGE_RATES[currency];
  };

  const formatPrice = (amount: number) => {
    const converted = convertPrice(amount);
    
    // Formatting with 2 decimal places if not KRW
    const value = currency === "KRW" 
      ? Math.round(converted).toLocaleString()
      : converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `${SYMBOLS[currency]}${value}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within a CurrencyProvider");
  return context;
}
