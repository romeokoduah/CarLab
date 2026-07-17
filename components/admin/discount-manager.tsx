"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import type { DiscountCode, DiscountType } from "@/lib/types";

interface Draft {
  code: string;
  type: DiscountType;
  value: number;
  minPrice: string;
  expiresAt: string;
  usageLimit: string;
  makeRestriction: string;
  active: boolean;
}

function toDraft(c?: DiscountCode): Draft {
  return {
    code: c?.code ?? "",
    type: c?.type ?? "percent",
    value: c?.value ?? 10,
    minPrice: c?.minPrice != null ? String(c.minPrice) : "",
    expiresAt: c?.expiresAt ? c.expiresAt.slice(0, 10) : "",
    usageLimit: c?.usageLimit != null ? String(c.usageLimit) : "",
    makeRestriction: c?.makeRestriction ?? "",
    active: c?.active ?? true,
  };
}

export function DiscountManager() {
  const discounts = useStore((s) => s.discounts);
  const addDiscount = useStore((s) => s.addDiscount);
  const updateDiscount = useStore((s) => s.updateDiscount);
  const deleteDiscount = useStore((s) => s.deleteDiscount);
  const toggleDiscount = useStore((s) => s.toggleDiscount);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => toDraft());

  const openAdd = () => {
    setEditingId(null);
    setDraft(toDraft());
    setOpen(true);
  };
  const openEdit = (c: DiscountCode) => {
    setEditingId(c.id);
    setDraft(toDraft(c));
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.code.trim()) {
      toast.error("Code is required.");
      return;
    }
    const payload = {
      code: draft.code.trim().toUpperCase(),
      type: draft.type,
      value: Number(draft.value),
      minPrice: draft.minPrice ? Number(draft.minPrice) : undefined,
      expiresAt: draft.expiresAt
        ? new Date(draft.expiresAt).toISOString()
        : undefined,
      usageLimit: draft.usageLimit ? Number(draft.usageLimit) : undefined,
      makeRestriction: draft.makeRestriction.trim() || undefined,
      active: draft.active,
    };
    if (editingId) {
      updateDiscount(editingId, payload);
      toast.success("Code updated");
    } else {
      addDiscount(payload);
      toast.success("Code created");
    }
    setOpen(false);
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Discount codes</h2>
          <p className="text-sm text-muted-foreground">
            Percentage or fixed-amount codes with limits and restrictions.
          </p>
        </div>
        <Button variant="gold" onClick={openAdd}>
          <Plus className="h-4 w-4" /> New code
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead className="hidden sm:table-cell">Conditions</TableHead>
              <TableHead className="hidden sm:table-cell">Usage</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No discount codes yet.
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((c) => {
                const expired =
                  c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="rounded-md bg-secondary px-2 py-1 font-mono text-xs font-medium">
                        {c.code}
                      </span>
                      {expired && (
                        <Badge variant="destructive" className="ml-2">
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.type === "percent"
                        ? `${c.value}%`
                        : `GHS ${c.value.toLocaleString()}`}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {[
                        c.minPrice
                          ? `min GHS ${c.minPrice.toLocaleString()}`
                          : null,
                        c.makeRestriction ? c.makeRestriction : null,
                        c.expiresAt
                          ? `exp ${c.expiresAt.slice(0, 10)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">
                      {c.usedCount}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.active}
                        onCheckedChange={() => toggleDiscount(c.id)}
                        aria-label="Toggle active"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              deleteDiscount(c.id);
                              toast.success("Code deleted");
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit code" : "New discount code"}</DialogTitle>
            <DialogDescription>
              Set the discount type, value and any conditions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                value={draft.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="SHOWROOM10"
                className="font-mono uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => set("type", v as DiscountType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed (GHS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{draft.type === "percent" ? "Percent" : "Amount (GHS)"}</Label>
                <Input
                  type="number"
                  value={draft.value}
                  onChange={(e) => set("value", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min price (GHS)</Label>
                <Input
                  type="number"
                  value={draft.minPrice}
                  onChange={(e) => set("minPrice", e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Usage limit</Label>
                <Input
                  type="number"
                  value={draft.usageLimit}
                  onChange={(e) => set("usageLimit", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Expires</Label>
                <Input
                  type="date"
                  value={draft.expiresAt}
                  onChange={(e) => set("expiresAt", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Make restriction</Label>
                <Input
                  value={draft.makeRestriction}
                  onChange={(e) => set("makeRestriction", e.target.value)}
                  placeholder="e.g. Toyota"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.active}
                onCheckedChange={(v) => set("active", v)}
              />
              <span className="text-sm">Active</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gold">
                {editingId ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
