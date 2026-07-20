"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Admin {
  id: string;
  email: string;
  name: string | null;
  role: "super_admin" | "admin";
  active: boolean;
  createdAt: string;
}

export function AdminsPanel({ currentEmail }: { currentEmail: string | null }) {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/admins");
    if (!res.ok) {
      toast.error("Only a super admin can manage users.");
      return;
    }
    setAdmins((await res.json()).admins);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create admin.");
      toast.success(`${email} can now sign in`, {
        description: "Share the password with them privately.",
      });
      setOpen(false);
      setEmail("");
      setName("");
      setPassword("");
      setRole("admin");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create admin.");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Could not update that admin.");
      return;
    }
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Team members who can sign in. Admins manage cars, customers and
          reservations; super admins can also manage users, duty rates and
          settings.
        </p>
        <Button variant="gold" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add admin
        </Button>
      </div>

      {!admins ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                  a.role === "super_admin"
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-border text-muted-foreground"
                }`}
              >
                {a.role === "super_admin" ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {a.name || a.email}
                  {a.email === currentEmail && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.email}
                </p>
              </div>

              <Select
                value={a.role}
                onValueChange={(v) => patch(a.id, { role: v })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Switch
                  checked={a.active}
                  onCheckedChange={(v) => patch(a.id, { active: v })}
                  aria-label="Active"
                />
                <Badge variant="default" className="text-[10px]">
                  {a.active ? "Active" : "Disabled"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add an admin</DialogTitle>
            <DialogDescription>
              They sign in at /admin with this email and password. Share the
              password privately — they can change it once signed in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ad-name">Name</Label>
              <Input
                id="ad-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ama Boateng"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-email">Email</Label>
              <Input
                id="ad-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-pass">Temporary password</Label>
              <Input
                id="ad-pass"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 10 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "admin" | "super_admin")}
              >
                <SelectTrigger id="ad-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — cars, customers, reservations</SelectItem>
                  <SelectItem value="super_admin">Super admin — full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" variant="gold" className="w-full" disabled={busy}>
              {busy ? "Creating…" : "Create admin"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
