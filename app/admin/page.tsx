"use client";

import Link from "next/link";
import {
  Car,
  Tag,
  BarChart3,
  Settings as SettingsIcon,
  Calculator,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { LoginForm } from "@/components/admin/login-form";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { DiscountManager } from "@/components/admin/discount-manager";
import { AnalyticsPanel } from "@/components/admin/analytics-panel";
import { SettingsForm } from "@/components/admin/settings-form";
import { DutyRatesForm } from "@/components/admin/duty-rates-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useMounted } from "@/lib/hooks";

export default function AdminPage() {
  const mounted = useMounted();
  const email = useAuth((s) => s.email);
  const signOut = useAuth((s) => s.signOut);
  const checkSession = useAuth((s) => s.checkSession);
  const [checking, setChecking] = useState(true);

  // Restore the session from the httpOnly cookie so a returning admin stays
  // signed in across reloads.
  useEffect(() => {
    checkSession().finally(() => setChecking(false));
  }, [checkSession]);

  if (!mounted || checking) {
    return (
      <div className="container py-10">
        <Skeleton className="mb-6 h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!email) return <LoginForm />;

  return (
    <div>
      {/* Admin header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5">
              <Link href="/" target="_blank">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">View site</span>
              </Link>
            </Button>
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {email}
          </p>
        </div>

        <Tabs defaultValue="inventory">
          <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            <TabsTrigger
              value="inventory"
              className="gap-1.5 rounded-full border border-border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-foreground"
            >
              <Car className="h-4 w-4" /> Inventory
            </TabsTrigger>
            <TabsTrigger
              value="discounts"
              className="gap-1.5 rounded-full border border-border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-foreground"
            >
              <Tag className="h-4 w-4" /> Discounts
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="gap-1.5 rounded-full border border-border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-foreground"
            >
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger
              value="duty"
              className="gap-1.5 rounded-full border border-border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-foreground"
            >
              <Calculator className="h-4 w-4" /> Duty rates
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="gap-1.5 rounded-full border border-border data-[state=active]:border-gold/40 data-[state=active]:bg-gold/10 data-[state=active]:text-foreground"
            >
              <SettingsIcon className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory">
            <InventoryManager />
          </TabsContent>
          <TabsContent value="discounts">
            <DiscountManager />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsPanel />
          </TabsContent>
          <TabsContent value="duty">
            <DutyRatesForm />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
