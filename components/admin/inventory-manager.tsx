"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/site/status-badge";
import { CarForm } from "@/components/admin/car-form";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/currency";
import { formatMileage } from "@/lib/utils";
import { toast } from "sonner";
import type { Car, CarStatus } from "@/lib/types";

export function InventoryManager() {
  const cars = useStore((s) => s.cars);
  const rate = useStore((s) => s.settings.ghsPerUsd);
  const deleteCar = useStore((s) => s.deleteCar);
  const duplicateCar = useStore((s) => s.duplicateCar);
  const setCarStatus = useStore((s) => s.setCarStatus);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CarStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Car | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Car | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cars.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!q) return true;
      return `${c.year} ${c.make} ${c.model} ${c.colour}`
        .toLowerCase()
        .includes(q);
    });
  }, [cars, query, status]);

  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (car: Car) => {
    setEditing(car);
    setFormOpen(true);
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings…"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as CarStatus | "all")}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Reserved">Reserved</SelectItem>
              <SelectItem value="Sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="gold" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add car
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead className="hidden sm:table-cell">Price</TableHead>
              <TableHead className="hidden md:table-cell">Mileage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  No listings match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((car) => (
                <TableRow key={car.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                        {car.images[0] && (
                          <Image
                            src={car.images[0].url}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized={car.images[0].url.startsWith("data:")}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="max-w-[46vw] truncate text-sm font-medium sm:max-w-[22rem]">
                          {car.year} {car.make} {car.model}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {car.bodyType} · {car.colour}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm sm:table-cell">
                    {formatPrice(car.priceGhs, "GHS", rate)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {formatMileage(car.mileageKm)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={car.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(car)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/car/${car.id}`} target="_blank">
                            <ExternalLink className="h-4 w-4" /> View listing
                          </Link>
                        </DropdownMenuItem>
                        {car.sourceUrl && (
                          <DropdownMenuItem asChild>
                            <a href={car.sourceUrl} target="_blank" rel="noopener noreferrer">
                              <ShoppingCart className="h-4 w-4" /> Buy from source
                            </a>
                          </DropdownMenuItem>
                        )}
                        {car.status !== "Sold" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setCarStatus(car.id, "Sold");
                              toast.success("Marked as sold");
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Mark sold
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            duplicateCar(car.id);
                            toast.success("Listing duplicated");
                          }}
                        >
                          <Copy className="h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(car)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {filtered.length} of {cars.length} listings
      </p>

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto max-sm:left-0 max-sm:top-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:w-full max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit listing" : "Add a car"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details for this vehicle."
                : "Fill in the details and upload photos to publish a new listing."}
            </DialogDescription>
          </DialogHeader>
          <CarForm car={editing} onDone={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete listing?</DialogTitle>
            <DialogDescription>
              {deleteTarget &&
                `${deleteTarget.year} ${deleteTarget.make} ${deleteTarget.model} will be permanently removed. This can't be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteCar(deleteTarget.id);
                  toast.success("Listing deleted");
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
