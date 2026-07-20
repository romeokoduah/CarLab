"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Trash2, Download, ChevronDown, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDebounced } from "@/lib/hooks";

interface LeadCar {
  id: string | null;
  label: string;
  createdAt: string;
}
interface Lead {
  id: string;
  reference: string;
  fullName: string;
  phone: string;
  email: string | null;
  consent: boolean;
  createdAt: string;
  lastSeenAt: string;
  enquiryCount: number;
  cars: LeadCar[];
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [query, setQuery] = useState("");
  const search = useDebounced(query, 300);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/admin/leads${search ? `?q=${encodeURIComponent(search)}` : ""}`,
    );
    if (!res.ok) {
      toast.error("Could not load customers.");
      return;
    }
    setLeads((await res.json()).leads);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (lead: Lead) => {
    const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${lead.fullName}'s record deleted`);
      setDeleteTarget(null);
      void load();
    } else {
      toast.error("Could not delete that record.");
    }
  };

  const exportCsv = () => {
    if (!leads?.length) return;
    const rows = [
      ["Reference", "Name", "Phone", "Email", "Enquiries", "First seen", "Last seen", "Cars"],
      ...leads.map((l) => [
        l.reference,
        l.fullName,
        l.phone,
        l.email ?? "",
        String(l.enquiryCount),
        when(l.createdAt),
        when(l.lastSeenAt),
        l.cars.map((c) => c.label).join(" | "),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eclipse-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, name, phone or email…"
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!leads?.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {!leads ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="font-medium">No customers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Details appear here as soon as someone enquires about a car.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const open = expanded === lead.id;
            return (
              <div
                key={lead.id}
                className="rounded-2xl border border-border bg-card"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                  <span className="rounded-md border border-gold/40 bg-gold/5 px-2.5 py-1 font-mono text-sm font-semibold tracking-[0.1em] text-gold">
                    {lead.reference}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{lead.fullName}</p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                      {lead.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant="default" className="shrink-0">
                    {lead.enquiryCount}{" "}
                    {lead.enquiryCount === 1 ? "enquiry" : "enquiries"}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    last seen {when(lead.lastSeenAt)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Show cars"
                      onClick={() => setExpanded(open ? null : lead.id)}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete customer"
                      className="text-destructive"
                      onClick={() => setDeleteTarget(lead)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                      Cars asked about
                    </p>
                    {lead.cars.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None yet.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {lead.cars.map((c, i) => (
                          <li
                            key={`${c.id}-${i}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{c.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {when(c.createdAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this customer record?</DialogTitle>
            <DialogDescription>
              {deleteTarget &&
                `${deleteTarget.fullName} (${deleteTarget.reference}) and all their enquiries and reservations will be permanently erased. Use this to honour a deletion request.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && remove(deleteTarget)}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
