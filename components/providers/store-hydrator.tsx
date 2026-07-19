"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Loads the catalogue (cars, discounts, settings) from the API into the client
 * store once, on first mount. Renders nothing.
 */
export function StoreHydrator() {
  useEffect(() => {
    void useStore.getState().hydrate();
  }, []);
  return null;
}
