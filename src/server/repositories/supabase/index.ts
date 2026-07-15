import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Conversation,
  Message,
  ProcessingJob,
  Profile,
  Project,
  Property,
  PropertyImage,
  RoomType,
} from "@/types/domain";
import type {
  ConversationRepository,
  JobPatch,
  MessageRepository,
  NewImage,
  NewJob,
  NewMessage,
  NewProject,
  ProcessingJobRepository,
  ProfileRepository,
  ProjectPatch,
  ProjectRepository,
  PropertyData,
  PropertyImageRepository,
  PropertyRepository,
  Repositories,
} from "@/server/repositories/types";

/**
 * Supabase-backed repositories (production path). RLS enforces per-user access;
 * the service layer adds defense-in-depth ownership checks. Rows are mapped from
 * snake_case to the camelCase domain shapes. Query `data` is validated-cast to a
 * declared Row type (justified: we don't ship generated Supabase types here).
 */

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`Supabase ${context} failed: ${error?.message ?? "unknown error"}`);
}

interface ProjectRow {
  id: string;
  owner_id: string;
  source_url: string;
  title: string;
  status: Project["status"];
  progress: number;
  active_job_step: Project["activeJobStep"];
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    sourceUrl: row.source_url,
    title: row.title,
    status: row.status,
    progress: row.progress,
    activeJobStep: row.active_job_step,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PropertyRow {
  id: string;
  project_id: string;
  address_line_1: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  lot_size: number | null;
  year_built: number | null;
  hoa_monthly: number | null;
  annual_property_tax: number | null;
  description: string | null;
  amenities: string[] | null;
  created_at: string;
  updated_at: string;
}

function mapProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    projectId: row.project_id,
    addressLine1: row.address_line_1,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    price: num(row.price),
    bedrooms: num(row.bedrooms),
    bathrooms: num(row.bathrooms),
    squareFeet: num(row.square_feet),
    lotSize: num(row.lot_size),
    yearBuilt: num(row.year_built),
    hoaMonthly: num(row.hoa_monthly),
    annualPropertyTax: num(row.annual_property_tax),
    description: row.description,
    amenities: row.amenities ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ImageRow {
  id: string;
  project_id: string;
  source_url: string;
  storage_path: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  room_type: RoomType;
  room_confidence: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function mapImage(row: ImageRow): PropertyImage {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceUrl: row.source_url,
    storagePath: row.storage_path,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
    roomType: row.room_type,
    roomConfidence: num(row.room_confidence) ?? 0,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

interface JobRow {
  id: string;
  project_id: string;
  type: ProcessingJob["type"];
  status: ProcessingJob["status"];
  progress: number;
  current_step: ProcessingJob["currentStep"];
  attempts: number;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapJob(row: JobRow): ProcessingJob {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type,
    status: row.status,
    progress: row.progress,
    currentStep: row.current_step,
    attempts: row.attempts,
    payload: row.payload ?? {},
    result: row.result,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseProfileRepository implements ProfileRepository {
  constructor(private db: SupabaseClient) {}
  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) fail("profiles.getById", error);
    if (!data) return null;
    const row = data as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      created_at: string;
      updated_at: string;
    };
    return {
      id: row.id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  async upsert(input: { id: string; fullName?: string | null; avatarUrl?: string | null }): Promise<Profile> {
    const { data, error } = await this.db
      .from("profiles")
      .upsert({ id: input.id, full_name: input.fullName ?? null, avatar_url: input.avatarUrl ?? null })
      .select("*")
      .single();
    if (error || !data) fail("profiles.upsert", error);
    const row = data as { id: string; full_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
    return { id: row.id, fullName: row.full_name, avatarUrl: row.avatar_url, createdAt: row.created_at, updatedAt: row.updated_at };
  }
}

class SupabaseProjectRepository implements ProjectRepository {
  constructor(private db: SupabaseClient) {}
  async create(input: NewProject): Promise<Project> {
    const { data, error } = await this.db
      .from("projects")
      .insert({ owner_id: input.ownerId, source_url: input.sourceUrl, title: input.title })
      .select("*")
      .single();
    if (error || !data) fail("projects.create", error);
    return mapProject(data as ProjectRow);
  }
  async getById(id: string): Promise<Project | null> {
    const { data, error } = await this.db.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) fail("projects.getById", error);
    return data ? mapProject(data as ProjectRow) : null;
  }
  async listByOwner(ownerId: string): Promise<Project[]> {
    const { data, error } = await this.db
      .from("projects")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) fail("projects.listByOwner", error);
    return (data as ProjectRow[]).map(mapProject);
  }
  async update(id: string, patch: ProjectPatch): Promise<Project> {
    const payload: Record<string, unknown> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.progress !== undefined) payload.progress = patch.progress;
    if (patch.activeJobStep !== undefined) payload.active_job_step = patch.activeJobStep;
    if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
    const { data, error } = await this.db.from("projects").update(payload).eq("id", id).select("*").single();
    if (error || !data) fail("projects.update", error);
    return mapProject(data as ProjectRow);
  }
  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("projects").delete().eq("id", id);
    if (error) fail("projects.delete", error);
  }
}

class SupabasePropertyRepository implements PropertyRepository {
  constructor(private db: SupabaseClient) {}
  async getByProjectId(projectId: string): Promise<Property | null> {
    const { data, error } = await this.db.from("properties").select("*").eq("project_id", projectId).maybeSingle();
    if (error) fail("properties.getByProjectId", error);
    return data ? mapProperty(data as PropertyRow) : null;
  }
  async upsert(projectId: string, d: PropertyData): Promise<Property> {
    const payload: Record<string, unknown> = { project_id: projectId };
    const set = (key: string, value: unknown) => {
      if (value !== undefined) payload[key] = value;
    };
    set("address_line_1", d.addressLine1);
    set("city", d.city);
    set("region", d.region);
    set("postal_code", d.postalCode);
    set("latitude", d.latitude);
    set("longitude", d.longitude);
    set("price", d.price);
    set("bedrooms", d.bedrooms);
    set("bathrooms", d.bathrooms);
    set("square_feet", d.squareFeet);
    set("lot_size", d.lotSize);
    set("year_built", d.yearBuilt);
    set("hoa_monthly", d.hoaMonthly);
    set("annual_property_tax", d.annualPropertyTax);
    set("description", d.description);
    set("amenities", d.amenities);
    const { data, error } = await this.db
      .from("properties")
      .upsert(payload, { onConflict: "project_id" })
      .select("*")
      .single();
    if (error || !data) fail("properties.upsert", error);
    return mapProperty(data as PropertyRow);
  }
}

class SupabasePropertyImageRepository implements PropertyImageRepository {
  constructor(private db: SupabaseClient) {}
  async listByProjectId(projectId: string): Promise<PropertyImage[]> {
    const { data, error } = await this.db
      .from("property_images")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    if (error) fail("property_images.listByProjectId", error);
    return (data as ImageRow[]).map(mapImage);
  }
  async getById(imageId: string): Promise<PropertyImage | null> {
    const { data, error } = await this.db.from("property_images").select("*").eq("id", imageId).maybeSingle();
    if (error) fail("property_images.getById", error);
    return data ? mapImage(data as ImageRow) : null;
  }
  async insertMissing(
    projectId: string,
    images: NewImage[],
  ): Promise<{ inserted: number; skipped: number; images: PropertyImage[] }> {
    const rows = images.map((image) => ({
      project_id: projectId,
      source_url: image.sourceUrl,
      storage_path: image.storagePath ?? null,
      sort_order: image.sortOrder,
      width: image.width ?? null,
      height: image.height ?? null,
      room_type: image.roomType ?? "other",
      room_confidence: image.roomConfidence ?? 0,
      metadata: image.metadata ?? {},
    }));
    // Idempotency comes from the (project_id, source_url) unique constraint;
    // ignoreDuplicates skips images already imported.
    const { data, error } = await this.db
      .from("property_images")
      .upsert(rows, { onConflict: "project_id,source_url", ignoreDuplicates: true })
      .select("*");
    if (error) fail("property_images.insertMissing", error);
    const inserted = (data as ImageRow[] | null)?.length ?? 0;
    const all = await this.listByProjectId(projectId);
    return { inserted, skipped: images.length - inserted, images: all };
  }
  async updateRoomType(
    imageId: string,
    roomType: RoomType,
    opts?: { confidence?: number; corrected?: boolean },
  ): Promise<PropertyImage> {
    const current = await this.getById(imageId);
    if (!current) fail("property_images.updateRoomType", { message: "image not found" });
    const payload: Record<string, unknown> = { room_type: roomType };
    if (opts?.confidence !== undefined) payload.room_confidence = opts.confidence;
    payload.metadata = {
      ...current.metadata,
      correctedByUser: opts?.corrected ? true : current.metadata?.correctedByUser === true,
    };
    const { data, error } = await this.db
      .from("property_images")
      .update(payload)
      .eq("id", imageId)
      .select("*")
      .single();
    if (error || !data) fail("property_images.updateRoomType", error);
    return mapImage(data as ImageRow);
  }
}

class SupabaseProcessingJobRepository implements ProcessingJobRepository {
  constructor(private db: SupabaseClient) {}
  async create(input: NewJob): Promise<ProcessingJob> {
    const { data, error } = await this.db
      .from("processing_jobs")
      .insert({ project_id: input.projectId, type: input.type ?? "ingest_listing", payload: input.payload ?? {} })
      .select("*")
      .single();
    if (error || !data) fail("processing_jobs.create", error);
    return mapJob(data as JobRow);
  }
  async getById(id: string): Promise<ProcessingJob | null> {
    const { data, error } = await this.db.from("processing_jobs").select("*").eq("id", id).maybeSingle();
    if (error) fail("processing_jobs.getById", error);
    return data ? mapJob(data as JobRow) : null;
  }
  async getLatestForProject(projectId: string): Promise<ProcessingJob | null> {
    const { data, error } = await this.db
      .from("processing_jobs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) fail("processing_jobs.getLatestForProject", error);
    return data ? mapJob(data as JobRow) : null;
  }
  async update(id: string, patch: JobPatch): Promise<ProcessingJob> {
    const payload: Record<string, unknown> = {};
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.progress !== undefined) payload.progress = patch.progress;
    if (patch.currentStep !== undefined) payload.current_step = patch.currentStep;
    if (patch.attempts !== undefined) payload.attempts = patch.attempts;
    if (patch.result !== undefined) payload.result = patch.result;
    if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
    if (patch.startedAt !== undefined) payload.started_at = patch.startedAt;
    if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;
    const { data, error } = await this.db.from("processing_jobs").update(payload).eq("id", id).select("*").single();
    if (error || !data) fail("processing_jobs.update", error);
    return mapJob(data as JobRow);
  }
}

class SupabaseConversationRepository implements ConversationRepository {
  constructor(private db: SupabaseClient) {}
  async getOrCreateForProject(projectId: string, ownerId: string): Promise<Conversation> {
    const { data: existing, error: selErr } = await this.db
      .from("conversations")
      .select("*")
      .eq("project_id", projectId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (selErr) fail("conversations.select", selErr);
    if (existing) return mapConversation(existing as ConversationRow);
    const { data, error } = await this.db
      .from("conversations")
      .insert({ project_id: projectId, owner_id: ownerId })
      .select("*")
      .single();
    if (error || !data) fail("conversations.create", error);
    return mapConversation(data as ConversationRow);
  }
  async getById(id: string): Promise<Conversation | null> {
    const { data, error } = await this.db.from("conversations").select("*").eq("id", id).maybeSingle();
    if (error) fail("conversations.getById", error);
    return data ? mapConversation(data as ConversationRow) : null;
  }
}

interface ConversationRow {
  id: string;
  project_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}
function mapConversation(row: ConversationRow): Conversation {
  return { id: row.id, projectId: row.project_id, ownerId: row.owner_id, createdAt: row.created_at, updatedAt: row.updated_at };
}

interface MessageRow {
  id: string;
  conversation_id: string;
  role: Message["role"];
  content: string;
  citations: Message["citations"] | null;
  created_at: string;
}

class SupabaseMessageRepository implements MessageRepository {
  constructor(private db: SupabaseClient) {}
  async listByConversation(conversationId: string): Promise<Message[]> {
    const { data, error } = await this.db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) fail("messages.listByConversation", error);
    return (data as MessageRow[]).map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      citations: row.citations ?? [],
      createdAt: row.created_at,
    }));
  }
  async insert(input: NewMessage): Promise<Message> {
    const { data, error } = await this.db
      .from("messages")
      .insert({
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,
        citations: input.citations ?? [],
      })
      .select("*")
      .single();
    if (error || !data) fail("messages.insert", error);
    const row = data as MessageRow;
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      citations: row.citations ?? [],
      createdAt: row.created_at,
    };
  }
}

export function createSupabaseRepositories(db: SupabaseClient): Repositories {
  return {
    profiles: new SupabaseProfileRepository(db),
    projects: new SupabaseProjectRepository(db),
    properties: new SupabasePropertyRepository(db),
    images: new SupabasePropertyImageRepository(db),
    jobs: new SupabaseProcessingJobRepository(db),
    conversations: new SupabaseConversationRepository(db),
    messages: new SupabaseMessageRepository(db),
  };
}
