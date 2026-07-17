"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnalyticsEvent,
  AnalyticsEventType,
  Car,
  CarStatus,
  Currency,
  DiscountCode,
  Settings,
} from "@/lib/types";
import { SEED_CARS, SEED_DISCOUNTS } from "@/lib/data/seed";
import { SITE_CONFIG } from "@/lib/config";

/**
 * Client-side data store. Acts as the demo backend: seeded from bundled data
 * and persisted to localStorage. Everything the storefront and admin read/write
 * flows through here, so admin edits reflect live on the storefront.
 *
 * To move to a real backend (Supabase / FastAPI), replace the bodies of these
 * actions with API calls — the component surface stays the same. See lib/api.ts.
 */

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

interface StoreState {
  cars: Car[];
  discounts: DiscountCode[];
  analytics: AnalyticsEvent[];
  favourites: string[];
  currency: Currency;
  settings: Settings;

  // preferences
  setCurrency: (c: Currency) => void;
  toggleFavourite: (id: string) => void;

  // car CRUD
  addCar: (car: Omit<Car, "id" | "createdAt">) => Car;
  updateCar: (id: string, patch: Partial<Car>) => void;
  deleteCar: (id: string) => void;
  duplicateCar: (id: string) => void;
  setCarStatus: (id: string, status: CarStatus) => void;

  // discount CRUD
  addDiscount: (code: Omit<DiscountCode, "id" | "usedCount">) => void;
  updateDiscount: (id: string, patch: Partial<DiscountCode>) => void;
  deleteDiscount: (id: string) => void;
  toggleDiscount: (id: string) => void;

  // settings + analytics
  updateSettings: (patch: Partial<Settings>) => void;
  recordEvent: (carId: string, type: AnalyticsEventType) => void;

  resetData: () => void;
}

const defaultSettings: Settings = {
  dealerName: SITE_CONFIG.dealerName,
  whatsappNumber: SITE_CONFIG.whatsappNumber,
  ghsPerUsd: SITE_CONFIG.ghsPerUsd,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      cars: SEED_CARS,
      discounts: SEED_DISCOUNTS,
      analytics: [],
      favourites: [],
      currency: "GHS",
      settings: defaultSettings,

      setCurrency: (c) => set({ currency: c }),

      toggleFavourite: (id) =>
        set((s) => {
          const has = s.favourites.includes(id);
          if (!has) {
            get().recordEvent(id, "favourite");
          }
          return {
            favourites: has
              ? s.favourites.filter((f) => f !== id)
              : [...s.favourites, id],
          };
        }),

      addCar: (car) => {
        const created: Car = {
          ...car,
          id: genId("car"),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ cars: [created, ...s.cars] }));
        return created;
      },

      updateCar: (id, patch) =>
        set((s) => ({
          cars: s.cars.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCar: (id) =>
        set((s) => ({
          cars: s.cars.filter((c) => c.id !== id),
          favourites: s.favourites.filter((f) => f !== id),
        })),

      duplicateCar: (id) =>
        set((s) => {
          const src = s.cars.find((c) => c.id === id);
          if (!src) return s;
          const copy: Car = {
            ...src,
            id: genId("car"),
            model: `${src.model} (copy)`,
            status: "Available",
            createdAt: new Date().toISOString(),
            images: src.images.map((im, i) => ({
              ...im,
              id: genId("img"),
              position: i,
            })),
          };
          return { cars: [copy, ...s.cars] };
        }),

      setCarStatus: (id, status) =>
        set((s) => ({
          cars: s.cars.map((c) => (c.id === id ? { ...c, status } : c)),
        })),

      addDiscount: (code) =>
        set((s) => ({
          discounts: [
            { ...code, id: genId("disc"), usedCount: 0 },
            ...s.discounts,
          ],
        })),

      updateDiscount: (id, patch) =>
        set((s) => ({
          discounts: s.discounts.map((d) =>
            d.id === id ? { ...d, ...patch } : d,
          ),
        })),

      deleteDiscount: (id) =>
        set((s) => ({
          discounts: s.discounts.filter((d) => d.id !== id),
        })),

      toggleDiscount: (id) =>
        set((s) => ({
          discounts: s.discounts.map((d) =>
            d.id === id ? { ...d, active: !d.active } : d,
          ),
        })),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      recordEvent: (carId, type) =>
        set((s) => ({
          analytics: [
            {
              id: genId("evt"),
              carId,
              type,
              createdAt: new Date().toISOString(),
            },
            ...s.analytics,
          ].slice(0, 2000),
        })),

      resetData: () =>
        set({
          cars: SEED_CARS,
          discounts: SEED_DISCOUNTS,
          analytics: [],
          favourites: [],
          settings: defaultSettings,
        }),
    }),
    {
      name: "carlab-store",
      version: 2,
      // v1 → v2 added extended specs (engine, drivetrain, seats, …). Refresh the
      // seed inventory to include them while preserving user preferences.
      migrate: (persisted, version) => {
        const state = persisted as Partial<StoreState>;
        if (state && version < 2) {
          return {
            ...state,
            cars: SEED_CARS,
            discounts: SEED_DISCOUNTS,
          } as StoreState;
        }
        return state as StoreState;
      },
    },
  ),
);
