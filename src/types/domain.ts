/**
 * Core domain entities. These are the single source of truth for shapes shared
 * between server and client — repositories map persistence rows onto these, and
 * UI consumes them. Dates are ISO-8601 strings so entities cross the RSC
 * boundary without serialization surprises.
 */

export type ProjectStatus = "draft" | "processing" | "ready" | "failed";

export type JobType = "ingest_listing";

export type JobStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

/** Ordered working steps of the ingestion pipeline (terminal state = job status). */
export const PROCESSING_STEPS = [
  "validating_url",
  "retrieving_data",
  "importing_photos",
  "classifying_rooms",
  "building_context",
  "preparing_experience",
] as const;

export type ProcessingStep = (typeof PROCESSING_STEPS)[number];

export const PROCESSING_STEP_LABELS: Record<ProcessingStep, string> = {
  validating_url: "Validating URL",
  retrieving_data: "Retrieving property data",
  importing_photos: "Importing photos",
  classifying_rooms: "Classifying rooms",
  building_context: "Building property context",
  preparing_experience: "Preparing interactive experience",
};

export type MessageRole = "user" | "assistant" | "system";

/** Canonical room-type taxonomy. Order is used for stable gallery grouping. */
export const ROOM_TYPES = [
  "exterior",
  "living_room",
  "kitchen",
  "dining_room",
  "primary_bedroom",
  "bedroom",
  "bathroom",
  "office",
  "garage",
  "backyard",
  "pool",
  "floorplan",
  "other",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  kitchen: "Kitchen",
  living_room: "Living Room",
  dining_room: "Dining Room",
  bedroom: "Bedroom",
  primary_bedroom: "Primary Bedroom",
  bathroom: "Bathroom",
  office: "Office",
  garage: "Garage",
  exterior: "Exterior",
  backyard: "Backyard",
  pool: "Pool",
  floorplan: "Floor Plan",
  other: "Other",
};

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  ownerId: string;
  sourceUrl: string;
  title: string;
  status: ProjectStatus;
  progress: number; // 0..100
  activeJobStep: ProcessingStep | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  projectId: string;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  hoaMonthly: number | null;
  annualPropertyTax: number | null;
  description: string | null;
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyImage {
  id: string;
  projectId: string;
  sourceUrl: string;
  storagePath: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  roomType: RoomType;
  roomConfidence: number; // 0..1
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProcessingJob {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0..100
  currentStep: ProcessingStep | null;
  attempts: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  /** Which grounded field/source backs an assistant claim. */
  source: string;
  label: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  createdAt: string;
}

/** Aggregate loaded for the workspace and AI context assembly. */
export interface ProjectWorkspace {
  project: Project;
  property: Property | null;
  images: PropertyImage[];
}
