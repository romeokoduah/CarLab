"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ADMIN_CREDENTIALS } from "@/lib/config";

/**
 * Demo authentication for the admin dashboard.
 *
 * This is a client-side gate for the seed/demo build only. For production,
 * replace `signIn` with Supabase Auth (`supabase.auth.signInWithPassword`)
 * and guard admin routes with a server session check / middleware.
 */
interface AuthState {
  email: string | null;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      signIn: (email, password) => {
        const okEmail =
          email.trim().toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase();
        const okPass = password === ADMIN_CREDENTIALS.password;
        if (okEmail && okPass) {
          set({ email: email.trim() });
          return { ok: true };
        }
        return { ok: false, error: "Invalid email or password." };
      },
      signOut: () => set({ email: null }),
    }),
    { name: "carlab-auth", version: 1 },
  ),
);
