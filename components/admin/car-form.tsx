"use client";

import { useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
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
import {
  ALL_MAKES,
  ENGINE_CAPACITIES,
  modelsForMake,
} from "@/lib/data/vehicles";
import { FEATURE_GROUPS, CATALOG_FEATURES } from "@/lib/data/features";
import type {
  BodyType,
  Car,
  CarImage,
  CarStatus,
  Condition,
  Drivetrain,
  Fuel,
  RegistrationStatus,
  Transmission,
} from "@/lib/types";

const TRANSMISSIONS: Transmission[] = ["Automatic", "Manual"];
const FUELS: Fuel[] = ["Petrol", "Diesel", "Hybrid", "Electric"];
const BODIES: BodyType[] = ["SUV", "Sedan", "Hatchback", "Pickup", "Coupe", "Van"];
const CONDITIONS: Condition[] = ["New", "Used", "Certified"];
const STATUSES: CarStatus[] = ["Available", "Reserved", "Sold"];
const DRIVETRAINS: Drivetrain[] = ["FWD", "RWD", "AWD", "4WD"];
const SEAT_OPTIONS = ["2", "4", "5", "6", "7", "8", "9"];
const DOOR_OPTIONS = ["2", "3", "4", "5"];
const REGISTRATION_OPTIONS: RegistrationStatus[] = [
  "Registered (Ghana)",
  "Duty paid, unregistered",
  "Duty not paid",
  "Foreign used",
  "Home used",
  "Brand new",
];

const NONE = "__none__";

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
  // extended
  engineCapacity: string;
  drivetrain: string;
  seats: string;
  doors: string;
  cylinders: string;
  horsepower: string;
  previousOwners: string;
  registrationStatus: string;
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
    engineCapacity: car?.engineCapacity ?? "",
    drivetrain: car?.drivetrain ?? "",
    seats: car?.seats != null ? String(car.seats) : "",
    doors: car?.doors != null ? String(car.doors) : "",
    cylinders: car?.cylinders != null ? String(car.cylinders) : "",
    horsepower: car?.horsepower != null ? String(car.horsepower) : "",
    previousOwners:
      car?.previousOwners != null ? String(car.previousOwners) : "",
    registrationStatus: car?.registrationStatus ?? "",
  };
}

const num = (s: string): number | undefined => {
  const v = Number(s);
  return s.trim() !== "" && !Number.isNaN(v) ? v : undefined;
};

export function CarForm({ car, onDone }: { car?: Car; onDone: () => void }) {
  const addCar = useStore((s) => s.addCar);
  const updateCar = useStore((s) => s.updateCar);
  const [f, setF] = useState<FormState>(() => initFrom(car));
  const [featureDraft, setFeatureDraft] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }));

  const modelOptions = useMemo(() => modelsForMake(f.make), [f.make]);

  const toggleFeature = (name: string) =>
    set(
      "features",
      f.features.includes(name)
        ? f.features.filter((x) => x !== name)
        : [...f.features, name],
    );

  const addCustomFeature = () => {
    const v = featureDraft.trim();
    if (v && !f.features.includes(v)) set("features", [...f.features, v]);
    setFeatureDraft("");
  };

  const customFeatures = f.features.filter((x) => !CATALOG_FEATURES.has(x));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.make.trim() || !f.model.trim()) {
      toast.error("Make and model are required.");
      return;
    }
    if (f.images.length === 0) {
      toast.error("Add at least one image.");
      return;
    }
    const payload = {
      make: f.make.trim(),
      model: f.model.trim(),
      year: f.year,
      priceGhs: f.priceGhs,
      mileageKm: f.mileageKm,
      transmission: f.transmission,
      fuel: f.fuel,
      bodyType: f.bodyType,
      colour: f.colour,
      condition: f.condition,
      status: f.status,
      verified: f.verified,
      description: f.description,
      features: f.features,
      videoUrl: f.videoUrl || undefined,
      images: f.images.map((im, i) => ({ ...im, position: i })),
      engineCapacity: f.engineCapacity.trim() || undefined,
      drivetrain: (f.drivetrain || undefined) as Drivetrain | undefined,
      seats: num(f.seats),
      doors: num(f.doors),
      cylinders: num(f.cylinders),
      horsepower: num(f.horsepower),
      previousOwners: num(f.previousOwners),
      registrationStatus: (f.registrationStatus || undefined) as
        | RegistrationStatus
        | undefined,
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
    <form onSubmit={submit} className="space-y-7">
      {/* Photos */}
      <section>
        <SectionTitle>Photos</SectionTitle>
        <ImageManager images={f.images} onChange={(imgs) => set("images", imgs)} />
      </section>

      {/* Identity */}
      <section>
        <SectionTitle>Make &amp; model</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Make" hint="Select or type to add a new make">
            <Combobox
              value={f.make}
              onChange={(v) => set("make", v)}
              options={ALL_MAKES}
              placeholder="e.g. Toyota, Chery, BYD…"
              addHint="Add make"
            />
          </Field>
          <Field label="Model" hint="Select or type to add a new model">
            <Combobox
              value={f.model}
              onChange={(v) => set("model", v)}
              options={modelOptions}
              placeholder="e.g. Corolla, Tiggo 7 Pro…"
              addHint="Add model"
            />
          </Field>
        </div>
      </section>

      {/* Pricing & basics */}
      <section>
        <SectionTitle>Pricing &amp; basics</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Year">
            <Input
              type="number"
              value={f.year}
              onChange={(e) => set("year", Number(e.target.value))}
            />
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
          <Field label="Colour">
            <Input
              value={f.colour}
              onChange={(e) => set("colour", e.target.value)}
              placeholder="Pearl White"
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
        </div>
      </section>

      {/* Engine & drivetrain */}
      <section>
        <SectionTitle>Engine &amp; drivetrain</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Fuel">
            <EnumSelect
              value={f.fuel}
              options={FUELS}
              onChange={(v) => set("fuel", v as Fuel)}
            />
          </Field>
          <Field label="Transmission">
            <EnumSelect
              value={f.transmission}
              options={TRANSMISSIONS}
              onChange={(v) => set("transmission", v as Transmission)}
            />
          </Field>
          <Field label="Engine capacity" hint="Select or type">
            <Combobox
              value={f.engineCapacity}
              onChange={(v) => set("engineCapacity", v)}
              options={ENGINE_CAPACITIES}
              placeholder="e.g. 2.0L"
              addHint="Use"
            />
          </Field>
          <Field label="Drivetrain">
            <OptionalSelect
              value={f.drivetrain}
              options={DRIVETRAINS}
              onChange={(v) => set("drivetrain", v)}
              placeholder="Select"
            />
          </Field>
          <Field label="Cylinders">
            <Input
              type="number"
              value={f.cylinders}
              onChange={(e) => set("cylinders", e.target.value)}
              placeholder="e.g. 4"
            />
          </Field>
          <Field label="Horsepower (bhp)">
            <Input
              type="number"
              value={f.horsepower}
              onChange={(e) => set("horsepower", e.target.value)}
              placeholder="e.g. 180"
            />
          </Field>
        </div>
      </section>

      {/* Body & capacity */}
      <section>
        <SectionTitle>Body &amp; capacity</SectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Body type">
            <EnumSelect
              value={f.bodyType}
              options={BODIES}
              onChange={(v) => set("bodyType", v as BodyType)}
            />
          </Field>
          <Field label="Seats">
            <OptionalSelect
              value={f.seats}
              options={SEAT_OPTIONS}
              onChange={(v) => set("seats", v)}
              placeholder="Select"
            />
          </Field>
          <Field label="Doors">
            <OptionalSelect
              value={f.doors}
              options={DOOR_OPTIONS}
              onChange={(v) => set("doors", v)}
              placeholder="Select"
            />
          </Field>
        </div>
      </section>

      {/* Ghana market */}
      <section>
        <SectionTitle>Ownership &amp; registration</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Registration / duty status">
            <OptionalSelect
              value={f.registrationStatus}
              options={REGISTRATION_OPTIONS}
              onChange={(v) => set("registrationStatus", v)}
              placeholder="Select"
            />
          </Field>
          <Field label="Previous owners">
            <Input
              type="number"
              value={f.previousOwners}
              onChange={(e) => set("previousOwners", e.target.value)}
              placeholder="e.g. 1"
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
      </section>

      {/* Description */}
      <section>
        <SectionTitle>Description</SectionTitle>
        <Textarea
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Condition, history, standout selling points…"
        />
      </section>

      {/* Features */}
      <section>
        <SectionTitle>
          Features
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {f.features.length} selected
          </span>
        </SectionTitle>
        <div className="space-y-4">
          {FEATURE_GROUPS.map((grp) => (
            <div key={grp.group}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {grp.group}
              </p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {grp.items.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-2.5 text-sm"
                  >
                    <Checkbox
                      checked={f.features.includes(item)}
                      onCheckedChange={() => toggleFeature(item)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom features */}
        <div className="mt-5">
          <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
            Add a custom feature
          </Label>
          <div className="flex gap-2">
            <Input
              value={featureDraft}
              onChange={(e) => setFeatureDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomFeature();
                }
              }}
              placeholder="Anything not listed above"
            />
            <Button type="button" variant="outline" onClick={addCustomFeature}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {customFeatures.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {customFeatures.map((ft) => (
                <span
                  key={ft}
                  className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 py-1 pl-3 pr-1.5 text-xs"
                >
                  {ft}
                  <button
                    type="button"
                    onClick={() => toggleFeature(ft)}
                    aria-label={`Remove ${ft}`}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Video */}
      <section>
        <SectionTitle>Video walkaround</SectionTitle>
        <Input
          value={f.videoUrl}
          onChange={(e) => set("videoUrl", e.target.value)}
          placeholder="YouTube embed URL, e.g. https://www.youtube.com/embed/…"
        />
      </section>

      <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-border bg-card px-6 py-4">
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold tracking-tight">{children}</h3>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
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

/** Select that allows an unset ("Not set") value. */
function OptionalSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Select
      value={value === "" ? NONE : value}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Not set</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
