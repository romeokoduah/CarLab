"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { GripVertical, Trash2, UploadCloud, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CarImage } from "@/lib/types";
import { cn } from "@/lib/utils";

function genId() {
  return `img-${Math.random().toString(36).slice(2, 9)}`;
}

interface Props {
  images: CarImage[];
  onChange: (images: CarImage[]) => void;
}

export function ImageManager({ images, onChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reindex = (list: CarImage[]) =>
    list.map((im, i) => ({ ...im, position: i }));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const added: CarImage[] = [];
      for (const file of Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      )) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error ?? `Upload failed for ${file.name}`);
          continue;
        }
        const { url } = await res.json();
        added.push({
          id: genId(),
          url,
          position: 0,
          alt: file.name.replace(/\.[^.]+$/, ""),
        });
      }
      if (added.length) onChange(reindex([...images, ...added]));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    onChange(reindex([...images, { id: genId(), url, position: 0, alt: "" }]));
    setUrlInput("");
  };

  const removeAt = (i: number) =>
    onChange(reindex(images.filter((_, idx) => idx !== i)));

  const onDrop = (target: number) => {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...images];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    onChange(reindex(next));
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div>
      {/* Dropzone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 py-8 text-center transition-colors hover:border-gold/50"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        ) : (
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm font-medium">
          {uploading ? "Uploading…" : "Drop images here or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground">
          The first image is the cover. Drag to reorder.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Add by URL */}
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="…or paste an image URL"
            className="pl-9"
          />
        </div>
        <Button type="button" variant="outline" onClick={addUrl}>
          Add
        </Button>
      </div>

      {/* Grid */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnter={() => setOverIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={cn(
                "group relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl border-2 bg-secondary active:cursor-grabbing",
                overIndex === i && dragIndex !== null
                  ? "border-gold"
                  : "border-border",
                dragIndex === i && "opacity-50",
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || ""}
                fill
                sizes="120px"
                className="object-cover"
                unoptimized={img.url.startsWith("data:")}
              />
              {i === 0 && (
                <Badge
                  variant="gold"
                  className="absolute left-1.5 top-1.5 text-[10px]"
                >
                  Cover
                </Badge>
              )}
              <div className="absolute inset-0 flex items-start justify-between bg-gradient-to-b from-black/40 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical className="h-4 w-4 text-white/80" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Remove image"
                  className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
