"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { initializeUser } from "@/store/slices/authSlice";

function Hydrator() {
  useEffect(() => {
    store.dispatch(initializeUser());
  }, []);
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <Hydrator />
      {children}
    </Provider>
  );
}
