import type {
  Conversation,
  Message,
  ProcessingJob,
  Profile,
  Project,
  Property,
  PropertyImage,
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
import { getMemoryStore, type MemoryStore } from "@/server/repositories/memory/store";

function now(): string {
  return new Date().toISOString();
}

function id(): string {
  return crypto.randomUUID();
}

class MemoryProfileRepository implements ProfileRepository {
  constructor(private store: MemoryStore) {}
  async getById(profileId: string): Promise<Profile | null> {
    return this.store.profiles.get(profileId) ?? null;
  }
  async upsert(input: { id: string; fullName?: string | null; avatarUrl?: string | null }): Promise<Profile> {
    const existing = this.store.profiles.get(input.id);
    const profile: Profile = {
      id: input.id,
      fullName: input.fullName ?? existing?.fullName ?? null,
      avatarUrl: input.avatarUrl ?? existing?.avatarUrl ?? null,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now(),
    };
    this.store.profiles.set(profile.id, profile);
    return profile;
  }
}

class MemoryProjectRepository implements ProjectRepository {
  constructor(private store: MemoryStore) {}
  async create(input: NewProject): Promise<Project> {
    const ts = now();
    const project: Project = {
      id: id(),
      ownerId: input.ownerId,
      sourceUrl: input.sourceUrl,
      title: input.title,
      status: "draft",
      progress: 0,
      activeJobStep: null,
      errorMessage: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.projects.set(project.id, project);
    return project;
  }
  async getById(projectId: string): Promise<Project | null> {
    return this.store.projects.get(projectId) ?? null;
  }
  async listByOwner(ownerId: string): Promise<Project[]> {
    return [...this.store.projects.values()]
      .filter((p) => p.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async update(projectId: string, patch: ProjectPatch): Promise<Project> {
    const existing = this.store.projects.get(projectId);
    if (!existing) throw new Error(`Project ${projectId} not found`);
    const updated: Project = { ...existing, ...patch, updatedAt: now() };
    this.store.projects.set(projectId, updated);
    return updated;
  }
  async delete(projectId: string): Promise<void> {
    this.store.projects.delete(projectId);
    this.store.properties.delete(projectId);
    for (const [key, img] of this.store.images) {
      if (img.projectId === projectId) this.store.images.delete(key);
    }
    for (const [key, job] of this.store.jobs) {
      if (job.projectId === projectId) this.store.jobs.delete(key);
    }
  }
}

class MemoryPropertyRepository implements PropertyRepository {
  constructor(private store: MemoryStore) {}
  async getByProjectId(projectId: string): Promise<Property | null> {
    return this.store.properties.get(projectId) ?? null;
  }
  async upsert(projectId: string, data: PropertyData): Promise<Property> {
    const existing = this.store.properties.get(projectId);
    const ts = now();
    const merged: Property = {
      id: existing?.id ?? id(),
      projectId,
      addressLine1: pick(data.addressLine1, existing?.addressLine1),
      city: pick(data.city, existing?.city),
      region: pick(data.region, existing?.region),
      postalCode: pick(data.postalCode, existing?.postalCode),
      latitude: pick(data.latitude, existing?.latitude),
      longitude: pick(data.longitude, existing?.longitude),
      price: pick(data.price, existing?.price),
      bedrooms: pick(data.bedrooms, existing?.bedrooms),
      bathrooms: pick(data.bathrooms, existing?.bathrooms),
      squareFeet: pick(data.squareFeet, existing?.squareFeet),
      lotSize: pick(data.lotSize, existing?.lotSize),
      yearBuilt: pick(data.yearBuilt, existing?.yearBuilt),
      hoaMonthly: pick(data.hoaMonthly, existing?.hoaMonthly),
      annualPropertyTax: pick(data.annualPropertyTax, existing?.annualPropertyTax),
      description: pick(data.description, existing?.description),
      amenities: data.amenities ?? existing?.amenities ?? [],
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    this.store.properties.set(projectId, merged);
    return merged;
  }
}

class MemoryPropertyImageRepository implements PropertyImageRepository {
  constructor(private store: MemoryStore) {}
  async listByProjectId(projectId: string): Promise<PropertyImage[]> {
    return [...this.store.images.values()]
      .filter((img) => img.projectId === projectId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async getById(imageId: string): Promise<PropertyImage | null> {
    return this.store.images.get(imageId) ?? null;
  }
  async insertMissing(
    projectId: string,
    images: NewImage[],
  ): Promise<{ inserted: number; skipped: number; images: PropertyImage[] }> {
    const existing = await this.listByProjectId(projectId);
    const existingUrls = new Set(existing.map((img) => img.sourceUrl));
    let inserted = 0;
    let skipped = 0;
    for (const image of images) {
      if (existingUrls.has(image.sourceUrl)) {
        skipped += 1;
        continue;
      }
      const record: PropertyImage = {
        id: id(),
        projectId,
        sourceUrl: image.sourceUrl,
        storagePath: image.storagePath ?? null,
        sortOrder: image.sortOrder,
        width: image.width ?? null,
        height: image.height ?? null,
        roomType: image.roomType ?? "other",
        roomConfidence: image.roomConfidence ?? 0,
        metadata: image.metadata ?? {},
        createdAt: now(),
      };
      this.store.images.set(record.id, record);
      existingUrls.add(record.sourceUrl);
      inserted += 1;
    }
    return { inserted, skipped, images: await this.listByProjectId(projectId) };
  }
  async updateRoomType(
    imageId: string,
    roomType: PropertyImage["roomType"],
    opts?: { confidence?: number; corrected?: boolean },
  ): Promise<PropertyImage> {
    const existing = this.store.images.get(imageId);
    if (!existing) throw new Error(`Image ${imageId} not found`);
    const updated: PropertyImage = {
      ...existing,
      roomType,
      roomConfidence: opts?.confidence ?? existing.roomConfidence,
      metadata: {
        ...existing.metadata,
        correctedByUser: opts?.corrected ? true : existing.metadata?.correctedByUser === true,
      },
    };
    this.store.images.set(imageId, updated);
    return updated;
  }
}

class MemoryProcessingJobRepository implements ProcessingJobRepository {
  constructor(private store: MemoryStore) {}
  async create(input: NewJob): Promise<ProcessingJob> {
    const ts = now();
    const job: ProcessingJob = {
      id: id(),
      projectId: input.projectId,
      type: input.type ?? "ingest_listing",
      status: "pending",
      progress: 0,
      currentStep: null,
      attempts: 0,
      payload: input.payload ?? {},
      result: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.store.jobs.set(job.id, job);
    return job;
  }
  async getById(jobId: string): Promise<ProcessingJob | null> {
    return this.store.jobs.get(jobId) ?? null;
  }
  async getLatestForProject(projectId: string): Promise<ProcessingJob | null> {
    return (
      [...this.store.jobs.values()]
        .filter((j) => j.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }
  async update(jobId: string, patch: JobPatch): Promise<ProcessingJob> {
    const existing = this.store.jobs.get(jobId);
    if (!existing) throw new Error(`Job ${jobId} not found`);
    const updated: ProcessingJob = { ...existing, ...patch, updatedAt: now() };
    this.store.jobs.set(jobId, updated);
    return updated;
  }
}

class MemoryConversationRepository implements ConversationRepository {
  constructor(private store: MemoryStore) {}
  async getOrCreateForProject(projectId: string, ownerId: string): Promise<Conversation> {
    const existing = [...this.store.conversations.values()].find(
      (c) => c.projectId === projectId && c.ownerId === ownerId,
    );
    if (existing) return existing;
    const ts = now();
    const conversation: Conversation = { id: id(), projectId, ownerId, createdAt: ts, updatedAt: ts };
    this.store.conversations.set(conversation.id, conversation);
    return conversation;
  }
  async getById(conversationId: string): Promise<Conversation | null> {
    return this.store.conversations.get(conversationId) ?? null;
  }
}

class MemoryMessageRepository implements MessageRepository {
  constructor(private store: MemoryStore) {}
  async listByConversation(conversationId: string): Promise<Message[]> {
    return [...this.store.messages.values()]
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async insert(input: NewMessage): Promise<Message> {
    const message: Message = {
      id: id(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      citations: input.citations ?? [],
      createdAt: now(),
    };
    this.store.messages.set(message.id, message);
    return message;
  }
}

function pick<T>(next: T | undefined, prev: T | undefined | null): T | null {
  if (next !== undefined) return next;
  return (prev ?? null) as T | null;
}

export function createMemoryRepositories(): Repositories {
  const store = getMemoryStore();
  return {
    profiles: new MemoryProfileRepository(store),
    projects: new MemoryProjectRepository(store),
    properties: new MemoryPropertyRepository(store),
    images: new MemoryPropertyImageRepository(store),
    jobs: new MemoryProcessingJobRepository(store),
    conversations: new MemoryConversationRepository(store),
    messages: new MemoryMessageRepository(store),
  };
}
