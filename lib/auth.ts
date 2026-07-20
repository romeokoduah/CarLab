"use client";

import { create } from "zustand";

/**
 * Admin auth client. The real session lives in an httpOnly cookie set by the
 * server (/api/admin/login); this store only mirrors the signed-in email for
 * the UI. `checkSession` restores it from the cookie on load.
 */
export type AdminRole = "super_admin" | "admin";

interface AuthState {
  email: string | null;
  role: AdminRole | null;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  email: null,
  role: null,

  signIn: async (email, password) => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? "Sign in failed." };
    }
    const data = await res.json();
    set({ email: data.email, role: data.role ?? "admin" });
    return { ok: true };
  },

  signOut: async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    set({ email: null, role: null });
  },

  checkSession: async () => {
    const res = await fetch("/api/admin/session");
    if (!res.ok) {
      set({ email: null, role: null });
      return;
    }
    const data = await res.json();
    set({ email: data.email, role: data.role ?? "admin" });
  },
}));
