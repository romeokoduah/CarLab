"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/logo";
import { useAuth } from "@/lib/auth";

export function LoginForm() {
  const signIn = useAuth((s) => s.signIn);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn(email, password);
    if (!res.ok) {
      setError(res.error ?? "Sign in failed.");
    } else {
      setError(null);
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <div className="mt-6 grid h-12 w-12 place-items-center rounded-2xl border border-gold/30 bg-gold/10">
            <Lock className="h-5 w-5 text-gold" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Admin sign in
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage inventory, discounts and settings.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@eclipsemotors.org"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="gold" className="w-full">
            <LogIn className="h-4 w-4" /> Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Authorised access only.
        </p>
      </div>
    </div>
  );
}
