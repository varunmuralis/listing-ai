import { z } from "zod";
import { listingUrlSchema } from "@/lib/validation/listing-url";
import { ROOM_TYPES } from "@/types/domain";

/**
 * Zod schemas for every untrusted boundary (forms + server actions). Coercion
 * turns empty form strings into `null` so partial listing data is representable.
 */

/** A number field that accepts "", null, or numeric input and yields number|null. */
const optionalNumber = (opts?: { min?: number; max?: number; int?: boolean }) =>
  z.preprocess(
    (v) => {
      if (v === "" || v === null || v === undefined) return null;
      if (typeof v === "string") {
        const n = Number(v.replace(/,/g, ""));
        return Number.isNaN(n) ? v : n;
      }
      return v;
    },
    (() => {
      let schema = z.number({ error: "Must be a number." });
      if (opts?.int) schema = schema.int("Must be a whole number.");
      if (opts?.min !== undefined) schema = schema.min(opts.min, `Must be at least ${opts.min}.`);
      if (opts?.max !== undefined) schema = schema.max(opts.max, `Must be at most ${opts.max}.`);
      return schema.nullable();
    })(),
  );

export const createProjectSchema = z.object({
  sourceUrl: listingUrlSchema,
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const propertyEditSchema = z.object({
  addressLine1: z.string().trim().max(200).nullable().default(null),
  city: z.string().trim().max(120).nullable().default(null),
  region: z.string().trim().max(120).nullable().default(null),
  postalCode: z.string().trim().max(20).nullable().default(null),
  price: optionalNumber({ min: 0, max: 1_000_000_000 }),
  bedrooms: optionalNumber({ min: 0, max: 100 }),
  bathrooms: optionalNumber({ min: 0, max: 100 }),
  squareFeet: optionalNumber({ min: 0, max: 1_000_000, int: true }),
  lotSize: optionalNumber({ min: 0, max: 100_000_000 }),
  yearBuilt: optionalNumber({ min: 1600, max: 2100, int: true }),
  hoaMonthly: optionalNumber({ min: 0, max: 100_000 }),
  annualPropertyTax: optionalNumber({ min: 0, max: 10_000_000 }),
  description: z.string().trim().max(10_000).nullable().default(null),
  amenities: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
});
export type PropertyEditInput = z.infer<typeof propertyEditSchema>;

export const roomCorrectionSchema = z.object({
  imageId: z.string().min(1),
  roomType: z.enum(ROOM_TYPES),
});
export type RoomCorrectionInput = z.infer<typeof roomCorrectionSchema>;

export const chatMessageSchema = z.object({
  content: z.string().trim().min(1, "Type a question.").max(2000),
});
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
