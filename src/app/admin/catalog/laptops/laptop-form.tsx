"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Brand } from "@/lib/api/admin/brands";
import { type LaptopInput, createLaptop, updateLaptop } from "@/lib/api/admin/laptops";
import { ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { type FieldDef, LAPTOP_FORM_GROUPS } from "./laptop-form-config";

type Values = Record<string, string | boolean>;

function seedValues(laptop?: BackendLaptop): Values {
  const values: Values = {};
  for (const group of LAPTOP_FORM_GROUPS) {
    for (const field of group.fields) {
      const raw = laptop?.[field.key as keyof BackendLaptop];
      if (field.type === "boolean") {
        values[field.key] = Boolean(raw);
      } else if (field.type === "stringlist") {
        values[field.key] = Array.isArray(raw) ? raw.join("\n") : "";
      } else if (field.type === "textarea") {
        values[field.key] = raw ? JSON.stringify(raw, null, 2) : "";
      } else {
        values[field.key] = raw === null || raw === undefined ? "" : String(raw);
      }
    }
  }
  return values;
}

function buildPayload(values: Values, brandId: string): LaptopInput {
  const payload: Record<string, unknown> = { brand_id: brandId };

  for (const group of LAPTOP_FORM_GROUPS) {
    for (const field of group.fields) {
      const raw = values[field.key];
      switch (field.type) {
        case "number":
          payload[field.key] = raw === "" ? null : Number(raw);
          break;
        case "boolean":
          payload[field.key] = Boolean(raw);
          break;
        case "stringlist":
          payload[field.key] = String(raw)
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          break;
        case "textarea":
          payload[field.key] = String(raw).trim() ? JSON.parse(String(raw)) : {};
          break;
        default:
          payload[field.key] = String(raw).trim() || null;
      }
    }
  }

  return payload as unknown as LaptopInput;
}

export function LaptopForm({
  mode,
  laptop,
  brands,
}: {
  mode: "create" | "edit";
  laptop?: BackendLaptop;
  brands: Brand[];
}) {
  const router = useRouter();
  const { token } = useAuth();
  const [brandId, setBrandId] = useState(laptop?.brand_id ?? "");
  const [values, setValues] = useState<Values>(() => seedValues(laptop));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField(key: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !brandId) return;
    setError(null);

    let payload: LaptopInput;
    try {
      payload = buildPayload(values, brandId);
    } catch {
      setError("Raw specs isn't valid JSON — fix it or leave it blank.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const created = await createLaptop(token, payload);
        toast.success(`Created ${created.product_name}.`);
      } else if (laptop) {
        const updated = await updateLaptop(token, laptop.id, payload);
        toast.success(`Updated ${updated.product_name}.`);
      }
      router.push("/admin/catalog/laptops");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save laptop.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <section className="border-line bg-surface rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-bold tracking-tight">Brand</h2>
        <Select
          items={brands.map((b) => ({ value: b.id, label: b.name }))}
          value={brandId}
          onValueChange={(v) => setBrandId(v as string)}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {LAPTOP_FORM_GROUPS.map((group) => (
        <section key={group.title} className="border-line bg-surface rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-bold tracking-tight">{group.title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => setField(field.key, v)}
              />
            ))}
          </div>
        </section>
      ))}

      {error && <p className="text-[13px] font-medium text-negative">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving || !brandId}>
          {saving ? "Saving…" : mode === "create" ? "Create laptop" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/catalog/laptops")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  const fullWidth = field.type === "stringlist" || field.type === "textarea";

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-xs font-semibold">
        <Checkbox checked={Boolean(value)} onCheckedChange={(c) => onChange(c === true)} />
        {field.label}
      </label>
    );
  }

  if (field.type === "stringlist" || field.type === "textarea") {
    return (
      <label className={`flex flex-col gap-1 text-xs font-semibold ${fullWidth ? "sm:col-span-2" : ""}`}>
        {field.label}
        <Textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-24 font-mono text-[12.5px]"
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-xs font-semibold">
      <span>
        {field.label}
        {field.required && <span className="text-negative"> *</span>}
      </span>
      <Input
        type={field.type === "number" ? "number" : "text"}
        step={field.type === "number" ? "any" : undefined}
        placeholder={field.placeholder}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
    </label>
  );
}
