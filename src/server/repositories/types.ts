import type {
  Conversation,
  Message,
  MessageRole,
  Citation,
  ProcessingJob,
  ProcessingStep,
  Profile,
  Project,
  ProjectStatus,
  Property,
  PropertyImage,
  RoomType,
  JobStatus,
} from "@/types/domain";

/**
 * Persistence interfaces. Two implementations satisfy these: an in-memory dev
 * adapter and a Supabase adapter. The service layer depends only on these
 * interfaces, never on a concrete database.
 */

export interface NewProject {
  ownerId: string;
  sourceUrl: string;
  title: string;
}

export interface ProjectPatch {
  title?: string;
  status?: ProjectStatus;
  progress?: number;
  activeJobStep?: ProcessingStep | null;
  errorMessage?: string | null;
}

/** Property fields writable through ingestion or the editor. */
export interface PropertyData {
  addressLine1?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  lotSize?: number | null;
  yearBuilt?: number | null;
  hoaMonthly?: number | null;
  annualPropertyTax?: number | null;
  description?: string | null;
  amenities?: string[];
}

export interface NewImage {
  sourceUrl: string;
  storagePath?: string | null;
  sortOrder: number;
  width?: number | null;
  height?: number | null;
  roomType?: RoomType;
  roomConfidence?: number;
  metadata?: Record<string, unknown>;
}

export interface NewJob {
  projectId: string;
  type?: "ingest_listing";
  payload?: Record<string, unknown>;
}

export interface JobPatch {
  status?: JobStatus;
  progress?: number;
  currentStep?: ProcessingStep | null;
  attempts?: number;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface NewMessage {
  conversationId: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
}

export interface ProfileRepository {
  getById(id: string): Promise<Profile | null>;
  upsert(input: { id: string; fullName?: string | null; avatarUrl?: string | null }): Promise<Profile>;
}

export interface ProjectRepository {
  create(input: NewProject): Promise<Project>;
  getById(id: string): Promise<Project | null>;
  listByOwner(ownerId: string): Promise<Project[]>;
  update(id: string, patch: ProjectPatch): Promise<Project>;
  delete(id: string): Promise<void>;
}

export interface PropertyRepository {
  getByProjectId(projectId: string): Promise<Property | null>;
  upsert(projectId: string, data: PropertyData): Promise<Property>;
}

export interface PropertyImageRepository {
  listByProjectId(projectId: string): Promise<PropertyImage[]>;
  getById(imageId: string): Promise<PropertyImage | null>;
  /** Idempotent bulk insert: skips images whose source_url already exists. */
  insertMissing(
    projectId: string,
    images: NewImage[],
  ): Promise<{ inserted: number; skipped: number; images: PropertyImage[] }>;
  updateRoomType(
    imageId: string,
    roomType: RoomType,
    opts?: { confidence?: number; corrected?: boolean },
  ): Promise<PropertyImage>;
}

export interface ProcessingJobRepository {
  create(input: NewJob): Promise<ProcessingJob>;
  getById(id: string): Promise<ProcessingJob | null>;
  getLatestForProject(projectId: string): Promise<ProcessingJob | null>;
  update(id: string, patch: JobPatch): Promise<ProcessingJob>;
}

export interface ConversationRepository {
  getOrCreateForProject(projectId: string, ownerId: string): Promise<Conversation>;
  getById(id: string): Promise<Conversation | null>;
}

export interface MessageRepository {
  listByConversation(conversationId: string): Promise<Message[]>;
  insert(input: NewMessage): Promise<Message>;
}

export interface Repositories {
  profiles: ProfileRepository;
  projects: ProjectRepository;
  properties: PropertyRepository;
  images: PropertyImageRepository;
  jobs: ProcessingJobRepository;
  conversations: ConversationRepository;
  messages: MessageRepository;
}
