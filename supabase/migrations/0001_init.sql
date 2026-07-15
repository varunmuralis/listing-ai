-- ListingAI initial schema
-- Postgres / Supabase. Every table has RLS enabled; users can only reach data
-- belonging to projects they own.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type project_status as enum ('draft', 'processing', 'ready', 'failed');
create type job_type as enum ('ingest_listing');
create type job_status as enum ('pending', 'running', 'succeeded', 'failed', 'cancelled');
create type processing_step as enum (
  'validating_url',
  'retrieving_data',
  'importing_photos',
  'classifying_rooms',
  'building_context',
  'preparing_experience'
);
create type room_type as enum (
  'kitchen', 'living_room', 'dining_room', 'bedroom', 'primary_bedroom',
  'bathroom', 'office', 'garage', 'exterior', 'backyard', 'pool',
  'floorplan', 'other'
);
create type message_role as enum ('user', 'assistant', 'system');

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_url text not null,
  title text not null default 'Untitled listing',
  status project_status not null default 'draft',
  progress int not null default 0 check (progress between 0 and 100),
  active_job_step processing_step,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_id_idx on projects (owner_id, created_at desc);
create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- properties (1:1 with project)
-- ---------------------------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  address_line_1 text,
  city text,
  region text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  price numeric(14, 2),
  bedrooms numeric(5, 1),
  bathrooms numeric(5, 1),
  square_feet integer,
  lot_size numeric(14, 2),
  year_built integer,
  hoa_monthly numeric(12, 2),
  annual_property_tax numeric(14, 2),
  description text,
  amenities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_project_id_idx on properties (project_id);
create trigger properties_set_updated_at
  before update on properties
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- property_images
-- ---------------------------------------------------------------------------
create table property_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  source_url text not null,
  storage_path text,
  sort_order integer not null default 0,
  width integer,
  height integer,
  room_type room_type not null default 'other',
  room_confidence real not null default 0 check (room_confidence between 0 and 1),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  -- Idempotent ingestion: a source image appears at most once per project.
  unique (project_id, source_url)
);
create index property_images_project_id_idx on property_images (project_id, sort_order);
create index property_images_room_type_idx on property_images (project_id, room_type);

-- ---------------------------------------------------------------------------
-- processing_jobs
-- ---------------------------------------------------------------------------
create table processing_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  type job_type not null default 'ingest_listing',
  status job_status not null default 'pending',
  progress int not null default 0 check (progress between 0 and 100),
  current_step processing_step,
  attempts int not null default 0,
  payload jsonb not null default '{}',
  result jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index processing_jobs_project_id_idx on processing_jobs (project_id, created_at desc);
create trigger processing_jobs_set_updated_at
  before update on processing_jobs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_project_id_idx on conversations (project_id);
create trigger conversations_set_updated_at
  before update on conversations
  for each row execute function set_updated_at();

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role message_role not null,
  content text not null,
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index messages_conversation_id_idx on messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table projects enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;
alter table processing_jobs enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Ownership helper: does the current user own this project?
create or replace function owns_project(pid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from projects p where p.id = pid and p.owner_id = auth.uid()
  );
$$;

-- profiles: a user sees and edits only their own profile.
create policy profiles_select_own on profiles
  for select using (id = auth.uid());
create policy profiles_update_own on profiles
  for update using (id = auth.uid());

-- projects: full CRUD limited to the owner.
create policy projects_select_own on projects
  for select using (owner_id = auth.uid());
create policy projects_insert_own on projects
  for insert with check (owner_id = auth.uid());
create policy projects_update_own on projects
  for update using (owner_id = auth.uid());
create policy projects_delete_own on projects
  for delete using (owner_id = auth.uid());

-- properties: gated by project ownership.
create policy properties_all_own on properties
  for all using (owns_project(project_id)) with check (owns_project(project_id));

-- property_images: gated by project ownership.
create policy property_images_all_own on property_images
  for all using (owns_project(project_id)) with check (owns_project(project_id));

-- processing_jobs: gated by project ownership.
create policy processing_jobs_all_own on processing_jobs
  for all using (owns_project(project_id)) with check (owns_project(project_id));

-- conversations: owner + project ownership.
create policy conversations_all_own on conversations
  for all using (owner_id = auth.uid() and owns_project(project_id))
  with check (owner_id = auth.uid() and owns_project(project_id));

-- messages: gated by conversation ownership.
create policy messages_all_own on messages
  for all using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.owner_id = auth.uid()
    )
  );
