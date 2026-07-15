"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { LoaderCircle, Plus, RotateCcw, Save, X } from "lucide-react";
import type { Property } from "@/types/domain";
import { listingEditSchema } from "@/types/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePropertyAction } from "@/server/actions/property-actions";
import { useSaveStatus } from "@/features/workspace/save-status";

/** All fields are strings for the inputs; the Zod schema coerces on submit. */
interface FormValues {
  title: string;
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  lotSize: string;
  yearBuilt: string;
  hoaMonthly: string;
  annualPropertyTax: string;
  description: string;
  amenities: string[];
}

function str(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function toDefaults(title: string, property: Property | null): FormValues {
  return {
    title,
    addressLine1: str(property?.addressLine1),
    city: str(property?.city),
    region: str(property?.region),
    postalCode: str(property?.postalCode),
    price: str(property?.price),
    bedrooms: str(property?.bedrooms),
    bathrooms: str(property?.bathrooms),
    squareFeet: str(property?.squareFeet),
    lotSize: str(property?.lotSize),
    yearBuilt: str(property?.yearBuilt),
    hoaMonthly: str(property?.hoaMonthly),
    annualPropertyTax: str(property?.annualPropertyTax),
    description: str(property?.description),
    amenities: property?.amenities ?? [],
  };
}

export function ListingEditor({
  projectId,
  title,
  property,
}: {
  projectId: string;
  title: string;
  property: Property | null;
}) {
  const router = useRouter();
  const { setState } = useSaveStatus();
  const defaults = React.useMemo(() => toDefaults(title, property), [title, property]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    control,
    formState: { isDirty, errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: defaults });

  // Mirror dirty state into the shared workspace save-status (top bar + guard).
  // Only transitions the "dirty" edge so an explicit "saving"/"saved"/"error"
  // state set during a save isn't clobbered.
  React.useEffect(() => {
    setState((prev) => (isDirty ? "dirty" : prev === "dirty" ? "idle" : prev));
  }, [isDirty, setState]);

  const amenities = useWatch({ control, name: "amenities" }) ?? [];

  const onSubmit = handleSubmit(async (values) => {
    const parsed = listingEditSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      for (const [key, messages] of Object.entries(fieldErrors)) {
        if (messages?.[0]) setError(key as keyof FormValues, { message: messages[0] });
      }
      setState("error");
      return;
    }

    setState("saving");
    const result = await updatePropertyAction(projectId, parsed.data);

    if (result.status === "success") {
      reset(values); // new pristine baseline (raw string values)
      setState("saved");
      toast.success("Listing saved");
      router.refresh();
      window.setTimeout(() => setState("idle"), 1600);
      return;
    }

    if (result.fieldErrors) {
      for (const [key, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) setError(key as keyof FormValues, { message: messages[0] });
      }
    }
    setState("error");
    toast.error(result.message ?? "We couldn't save your changes.");
  });

  function addAmenity(value: string) {
    const trimmed = value.trim();
    if (!trimmed || amenities.includes(trimmed)) return;
    setValue("amenities", [...amenities, trimmed], { shouldDirty: true });
  }

  function removeAmenity(value: string) {
    setValue(
      "amenities",
      amenities.filter((a) => a !== value),
      { shouldDirty: true },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <FieldSection title="Listing">
        <Field label="Listing title" error={errors.title?.message} className="sm:col-span-2">
          <Input {...register("title")} aria-invalid={!!errors.title} />
        </Field>
      </FieldSection>

      <FieldSection title="Address">
        <Field label="Street address" error={errors.addressLine1?.message} className="sm:col-span-2">
          <Input {...register("addressLine1")} aria-invalid={!!errors.addressLine1} />
        </Field>
        <Field label="City" error={errors.city?.message}>
          <Input {...register("city")} aria-invalid={!!errors.city} />
        </Field>
        <Field label="State / region" error={errors.region?.message}>
          <Input {...register("region")} aria-invalid={!!errors.region} />
        </Field>
        <Field label="Postal code" error={errors.postalCode?.message}>
          <Input {...register("postalCode")} aria-invalid={!!errors.postalCode} />
        </Field>
      </FieldSection>

      <FieldSection title="Facts">
        <NumberField label="Price (USD)" error={errors.price?.message} field={register("price")} />
        <NumberField label="Bedrooms" error={errors.bedrooms?.message} field={register("bedrooms")} />
        <NumberField label="Bathrooms" error={errors.bathrooms?.message} field={register("bathrooms")} />
        <NumberField label="Square feet" error={errors.squareFeet?.message} field={register("squareFeet")} />
        <NumberField label="Lot size (sq ft)" error={errors.lotSize?.message} field={register("lotSize")} />
        <NumberField label="Year built" error={errors.yearBuilt?.message} field={register("yearBuilt")} />
        <NumberField label="HOA (monthly USD)" error={errors.hoaMonthly?.message} field={register("hoaMonthly")} />
        <NumberField
          label="Annual property tax (USD)"
          error={errors.annualPropertyTax?.message}
          field={register("annualPropertyTax")}
        />
      </FieldSection>

      <FieldSection title="Description">
        <Field label="MLS description" error={errors.description?.message} className="sm:col-span-2">
          <Textarea rows={6} {...register("description")} aria-invalid={!!errors.description} />
        </Field>
      </FieldSection>

      <FieldSection title="Amenities">
        <div className="sm:col-span-2">
          <AmenitiesEditor amenities={amenities} onAdd={addAmenity} onRemove={removeAmenity} />
          {errors.amenities?.message ? (
            <p className="mt-1.5 text-xs text-destructive">{errors.amenities.message}</p>
          ) : null}
        </div>
      </FieldSection>

      {/* Sticky action bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border border-border bg-popover/90 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-xs text-muted-foreground">
          {isDirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!isDirty || isSubmitting}
            onClick={() => {
              reset(defaults);
              setState("idle");
            }}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
          <Button type="submit" size="sm" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}

function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  // Associate the label with the single control so it's accessible + focusable.
  const control = React.isValidElement<{ id?: string }>(children)
    ? React.cloneElement(children, { id })
    : children;
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      {control}
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function NumberField({ label, error, field }: { label: string; error?: string; field: UseFormRegisterReturn }) {
  return (
    <Field label={label} error={error}>
      <Input inputMode="decimal" autoComplete="off" aria-invalid={!!error} {...field} />
    </Field>
  );
}

function AmenitiesEditor({
  amenities,
  onAdd,
  onRemove,
}: {
  amenities: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const inputId = React.useId();

  function commit() {
    onAdd(draft);
    setDraft("");
  }

  return (
    <div>
      <Label htmlFor={inputId} className="mb-1.5 block">
        Amenities
      </Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="Add an amenity and press Enter"
        />
        <Button type="button" variant="secondary" size="icon" onClick={commit} aria-label="Add amenity">
          <Plus className="size-4" />
        </Button>
      </div>
      {amenities.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {amenities.map((amenity) => (
            <li
              key={amenity}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent px-3 py-1 text-sm"
            >
              {amenity}
              <button
                type="button"
                onClick={() => onRemove(amenity)}
                aria-label={`Remove ${amenity}`}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No amenities yet.</p>
      )}
    </div>
  );
}
