"use client";

import { useEffect, useState } from "react";

/**
 * The list-page state every table in the reference repeats: page/limit, filters, and a
 * search box debounced by 300ms that resets to page 1.
 */
export function useListParams<F extends Record<string, string>>(filters: F, limit = 20) {
  const [searchInput, setSearchInput] = useState("");
  const [params, setParams] = useState({ search: "", page: 1, limit, ...filters });

  useEffect(() => {
    const t = setTimeout(() => setParams((p) => ({ ...p, search: searchInput.trim(), page: 1 })), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  /** Drops empty strings so the api never sees `status=`. */
  const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined)) as Partial<
    typeof params
  >;

  return {
    params,
    query,
    searchInput,
    setSearchInput,
    setFilter: (key: keyof F, value: string) => setParams((p) => ({ ...p, [key]: value, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  };
}
