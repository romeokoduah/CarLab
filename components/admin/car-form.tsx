"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageManager } from "@/components/admin/image-manager";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import type {
  BodyType,
  Car,
  CarImage,
  CarStatus,
  Condition,
  Fuel,
  Transmission,
} from "@/lib/types";

const TRANSMISSIONS: Transmission[] = ["Automatic", "Manual"];
const FUELS: Fuel[] = ["Petrol", "Diesel", "Hybrid", "Electric"];
const BODIES: BodyType[] = ["SUV", "Sedan", "Hatchback", "Pickup", "Coupe", "Van"];
const CONDITIONS: Condition[] = ["New", "Used", "Certified"];
const STATUSES: CarStatus[] = ["Available", "Reserved", "Sold"];

interface FormState {
  make: string;
  model: string;
  year: number;
  priceGhs: number;
  mileageKm: number;
  transmission: Transmission;
  fuel: Fuel;
  bodyType: BodyType;
  colour: string;
  condition: Condition;
  status: CarStatus;
  verified: boolean;
  description: string;
  features: string[];
  videoUrl: string;
  images: CarImage[];
}

function initFrom(car?: Car): FormState {
  return {
    make: car?.make ?? "",
    model: car?.model ?? "",
    year: car?.year ?? new Date().getFullYear(),
    priceGhs: car?.priceGhs ?? 0,
    mileageKm: car?.mileageKm ?? 0,
    transmission: car?.transmission ?? "Automatic",
    fuel: car?.fuel ?? "Petrol",
    bodyType: car?.bodyType ?? "SUV",
    colour: car?.colour ?? "",
    condition: car?.condition ?? "Used",
    status: car?.status ?? "Available",
    verified: car?.verified ?? true,
    description: car?.description ?? "",
    features: car?.features ?? [],
    videoUrl: car?.videoUrl ?? "",
    images: car?.images ?? [],
  };
}

export function CarForm({ car, onDone }: { car?: Car; onDone: () => void }) {
  const addCar = useStore((s) => s.addCar);
  const updateCar = useStore((s) => s.updateCar);
  const [f, setF] = useState<FormState>(() => initFrom(car));
  const [featureDraft, setFeatureDraft] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const addFeature = () => {
    const v = featureDraft.trim();
    if (v && !f.features.includes(v)) {
      set("features", [...f.features, v]);
    }
    setFeatureDraft("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.make || !f.model) {
      toast.error("Make and model are required.");
      return;
    }
    if (f.images.length === 0) {
      toast.error("Add at least one image.");
      return;
    }
    const payload = {
      ...f,
      videoUrl: f.videoUrl || undefined,
      images: f.images.map((im, i) => ({ ...im, position: i })),
    };
    if (car) {
      updateCar(car.id, payload);
      toast.success("Listing updated");
    } else {
      addCar(payload);
      toast.success("Listing added");
    }
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Images */}
      <div>
        <Label className="mb-2 block">Photos</Label>
        <ImageManager images={f.images} onChange={(imgs) => set("images", imgs)} />
      </div>

      {/* Basics */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Make">
          <Input value={f.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota" />
        </Field>
        <Field label="Model">
          <Input value={f.model} onChange={(e) => set("model", e.target.value)} placeholder="Land Cruiser" />
        </Field>
        <Field label="Year">
          <Input
            type="number"
            value={f.year}
            onChange={(e) => set("year", Number(e.target.value))}
          />
        </Field>
        <Field label="Colour">
          <Input value={f.colour} onChange={(e) => set("colour", e.target.value)} placeholder="Pearl White" />
        </Field>
        <Field label="Price (GHS)">
          <Input
            type="number"
            value={f.priceGhs}
            onChange={(e) => set("priceGhs", Number(e.target.value))}
          />
        </Field>
        <Field label="Mileage (km)">
          <Input
            type="number"
            value={f.mileageKm}
            onChange={(e) => set("mileageKm", Number(e.target.value))}
          />
        </Field>
      </div>

      {/* Selects */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Transmission">
          <EnumSelect
            value={f.transmission}
            options={TRANSMISSIONS}
            onChange={(v) => set("transmission", v as Transmission)}
          />
        </Field>
        <Field label="Fuel">
          <EnumSelect
            value={f.fuel}
            options={FUELS}
            onChange={(v) => set("fuel", v as Fuel)}
          />
        </Field>
        <Field label="Body type">
          <EnumSelect
            value={f.bodyType}
            options={BODIES}
            onChange={(v) => set("bodyType", v as BodyType)}
          />
        </Field>
        <Field label="Condition">
          <EnumSelect
            value={f.condition}
            options={CONDITIONS}
            onChange={(v) => set("condition", v as Condition)}
          />
        </Field>
        <Field label="Status">
          <EnumSelect
            value={f.status}
            options={STATUSES}
            onChange={(v) => set("status", v as CarStatus)}
          />
        </Field>
        <Field label="Verified">
          <div className="flex h-10 items-center gap-2">
            <Switch
              checked={f.verified}
              onCheckedChange={(v) => set("verified", v)}
            />
            <span className="text-sm text-muted-foreground">
              {f.verified ? "Verified" : "Not verified"}
            </span>
          </div>
        </Field>
      </div>

      {/* Description */}
      <Field label="Description">
        <Textarea
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Condition, history, standout features…"
        />
      </Field>

      {/* Features */}
      <div>
        <Label className="mb-1.5 block">Features</Label>
        <div className="flex gap-2">
          <Input
            value={featureDraft}
            onChange={(e) => setFeatureDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFeature();
              }
            }}
            placeholder="e.g. Sunroof"
          />
          <Button type="button" variant="outline" onClick={addFeature}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {f.features.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {f.features.map((ft) => (
              <span
                key={ft}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 py-1 pl-3 pr-1.5 text-xs"
              >
                {ft}
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "features",
                      f.features.filter((x) => x !== ft),
                    )
                  }
                  aria-label={`Remove ${ft}`}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Video */}
      <Field label="Video walkaround (YouTube embed URL)">
        <Input
          value={f.videoUrl}
          onChange={(e) => set("videoUrl", e.target.value)}
          placeholder="https://www.youtube.com/embed/…"
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="gold">
          {car ? "Save changes" : "Add listing"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EnumSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
