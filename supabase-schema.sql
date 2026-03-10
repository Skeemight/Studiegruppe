-- =============================================================================
-- Studiegruppe Hub — Supabase Schema
-- Run this in the Supabase SQL editor to set up the database.
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy search later

-- ── Groups ───────────────────────────────────────────────────────────────────
-- Must be created before profiles (profiles reference groups).
create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  institution   text,
  education     text,
  invite_code   text unique not null,
  course_mapping jsonb not null default '{}',  -- eventTitle → courseId map
  created_at    timestamptz not null default now()
);

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users with a display name and group membership.
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null,
  group_id      uuid references public.groups on delete set null,
  created_at    timestamptz not null default now()
);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: get the current user's group_id (used in RLS policies)
create or replace function public.current_group_id()
returns uuid language sql security definer stable as $$
  select group_id from public.profiles where id = auth.uid()
$$;

-- ── Courses ───────────────────────────────────────────────────────────────────
-- id is a text string from the app (Canvas IDs like 'canvas-12345', or custom).
create table public.courses (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  name          text not null,
  semester      text not null default '',
  color         text,
  code          text,
  canvas_course_id text,       -- original Canvas course ID for deduplication
  created_at    timestamptz not null default now(),
  unique (group_id, canvas_course_id)
);
create index on public.courses (group_id);

-- ── Documents ─────────────────────────────────────────────────────────────────
create table public.documents (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text references public.courses on delete set null,
  title         text not null,
  url           text not null,
  tags          text[] not null default '{}',
  canvas_id     text,          -- original Canvas file/item ID
  created_at    timestamptz,   -- from Canvas, nullable for manual entries
  synced_at     timestamptz not null default now(),
  unique (group_id, canvas_id)
);
create index on public.documents (group_id);
create index on public.documents (course_id);

-- ── Schedule events ───────────────────────────────────────────────────────────
create table public.schedule_events (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  title         text not null,
  start_time    timestamptz not null,
  end_time      timestamptz not null,
  location      text,
  ics_uid       text,          -- original ICS UID for deduplication
  unique (group_id, ics_uid)
);
create index on public.schedule_events (group_id);

-- ── Tasks ─────────────────────────────────────────────────────────────────────
create table public.tasks (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text references public.courses on delete set null,
  title         text not null,
  deadline      timestamptz,
  status        text not null default 'todo',
  assigned_to   text,
  url           text,
  canvas_id     text,
  created_at    timestamptz not null default now(),
  unique (group_id, canvas_id)
);
create index on public.tasks (group_id);

-- ── Canvas modules ────────────────────────────────────────────────────────────
-- items is a JSONB array of CanvasModuleItem objects.
create table public.canvas_modules (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text references public.courses on delete cascade,
  name          text not null,
  position      integer not null default 0,
  week          integer,
  items         jsonb not null default '[]'
);
create index on public.canvas_modules (group_id);
create index on public.canvas_modules (course_id);

-- ── Exams ────────────────────────────────────────────────────────────────────
create table public.exams (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text references public.courses on delete set null,
  course_name   text,
  title         text,
  date          date not null,
  notes         text not null default '',
  topics        jsonb not null default '[]',
  created_at    timestamptz not null default now()
);
create index on public.exams (group_id);

-- ── Meetings (old-style meeting notes) ───────────────────────────────────────
create table public.meetings (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  title         text not null,
  date          date not null,
  location      text not null default '',
  agenda        text[] not null default '{}',
  decisions     text[] not null default '{}',
  created_at    timestamptz not null default now()
);
create index on public.meetings (group_id);

-- ── Study notes ───────────────────────────────────────────────────────────────
create table public.study_notes (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text references public.courses on delete set null,
  title         text not null,
  week          text not null default '',
  format        text not null default 'link',
  url           text not null default '',
  source_type   text not null default 'link',
  file_name     text,
  mime_type     text,
  tags          text[] not null default '{}',
  exam_relevant boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on public.study_notes (group_id);

-- ── Week focus ────────────────────────────────────────────────────────────────
create table public.week_focus (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text references public.courses on delete set null,
  week          text not null,
  text          text not null,
  done          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on public.week_focus (group_id);

-- ── Lesson notes ─────────────────────────────────────────────────────────────
create table public.lesson_notes (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text references public.courses on delete cascade,
  module_id     text not null,
  lesson_title  text not null default '',
  content       text not null,
  author_id     uuid references auth.users on delete set null,
  author_name   text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.lesson_notes (group_id);
create index on public.lesson_notes (course_id);

-- ── Group assignments ─────────────────────────────────────────────────────────
-- tasks, files, comments, meeting_notes stored as JSONB for simplicity.
create table public.group_assignments (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text,
  course_name   text not null default '',
  title         text not null,
  description   text,
  deadline      date not null,
  status        text not null default 'active',
  tasks         jsonb not null default '[]',
  files         jsonb not null default '[]',
  comments      jsonb not null default '[]',
  meeting_notes jsonb not null default '[]',
  created_by    uuid references auth.users on delete set null,
  created_at    timestamptz not null default now()
);
create index on public.group_assignments (group_id);

-- ── Group meetings ────────────────────────────────────────────────────────────
create table public.group_meetings (
  id             text primary key,
  group_id       uuid not null references public.groups on delete cascade,
  title          text not null,
  date           text,          -- YYYY-MM-DD (nullable until time poll resolved)
  start_time     text,
  end_time       text,
  location       text not null default '',
  assignment_id  text references public.group_assignments on delete set null,
  description    text,
  notes          text not null default '',
  time_poll      jsonb,         -- TimePollSlot[] | undefined
  status         text not null default 'planned',
  created_by     uuid references auth.users on delete set null,
  created_at     timestamptz not null default now()
);
create index on public.group_meetings (group_id);

-- ── Group checklist ───────────────────────────────────────────────────────────
create table public.group_checklist (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  text          text not null,
  done          boolean not null default false,
  added_by_id   uuid references auth.users on delete set null,
  added_by_name text not null default '',
  added_at      timestamptz not null default now()
);
create index on public.group_checklist (group_id);

-- ── Group activity ────────────────────────────────────────────────────────────
create table public.group_activity (
  id            text primary key,
  group_id      uuid not null references public.groups on delete cascade,
  type          text not null,
  message       text not null,
  user_id       text,
  user_name     text not null default '',
  assignment_id text,
  meeting_id    text,
  timestamp     timestamptz not null default now()
);
create index on public.group_activity (group_id);
create index on public.group_activity (timestamp desc);

-- ── Member availability ───────────────────────────────────────────────────────
create table public.member_availability (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups on delete cascade,
  user_id       text not null,
  text          text not null,
  updated_at    timestamptz not null default now(),
  unique (group_id, user_id)
);
create index on public.member_availability (group_id);

-- ── Module anchors ────────────────────────────────────────────────────────────
-- Stores manual week→module mappings set via the settings/mapping page.
create table public.module_anchors (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups on delete cascade,
  course_id     text not null,
  week_number   integer not null,
  module_id     text,
  module_name   text,
  set_by        uuid references auth.users on delete set null,
  created_at    timestamptz not null default now(),
  unique (group_id, course_id, week_number)
);
create index on public.module_anchors (group_id, course_id);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on all tables
alter table public.groups              enable row level security;
alter table public.profiles            enable row level security;
alter table public.courses             enable row level security;
alter table public.documents           enable row level security;
alter table public.schedule_events     enable row level security;
alter table public.tasks               enable row level security;
alter table public.canvas_modules      enable row level security;
alter table public.exams               enable row level security;
alter table public.meetings            enable row level security;
alter table public.study_notes         enable row level security;
alter table public.week_focus          enable row level security;
alter table public.lesson_notes        enable row level security;
alter table public.group_assignments   enable row level security;
alter table public.group_meetings      enable row level security;
alter table public.group_checklist     enable row level security;
alter table public.group_activity      enable row level security;
alter table public.member_availability enable row level security;
alter table public.module_anchors      enable row level security;

-- Groups: members can see their own group; anyone can read a group by invite code (to join)
create policy "members_see_own_group" on public.groups
  for select to authenticated
  using (id = public.current_group_id() or true); -- any auth user can look up a group to join

create policy "members_update_own_group" on public.groups
  for update to authenticated
  using (id = public.current_group_id());

create policy "authenticated_insert_group" on public.groups
  for insert to authenticated
  with check (true);

-- Profiles: see all members in your group; only update your own
create policy "see_group_profiles" on public.profiles
  for select to authenticated
  using (group_id = public.current_group_id() or id = auth.uid());

create policy "update_own_profile" on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- Generic group-scoped policy macro (applied to all data tables)
-- Courses
create policy "group_access" on public.courses
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Documents
create policy "group_access" on public.documents
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Schedule events
create policy "group_access" on public.schedule_events
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Tasks
create policy "group_access" on public.tasks
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Canvas modules
create policy "group_access" on public.canvas_modules
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Exams
create policy "group_access" on public.exams
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Meetings
create policy "group_access" on public.meetings
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Study notes
create policy "group_access" on public.study_notes
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Week focus
create policy "group_access" on public.week_focus
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Lesson notes
create policy "group_access" on public.lesson_notes
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Group assignments
create policy "group_access" on public.group_assignments
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Group meetings
create policy "group_access" on public.group_meetings
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Group checklist
create policy "group_access" on public.group_checklist
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Group activity
create policy "group_access" on public.group_activity
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Member availability
create policy "group_access" on public.member_availability
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- Module anchors
create policy "group_access" on public.module_anchors
  for all to authenticated
  using (group_id = public.current_group_id())
  with check (group_id = public.current_group_id());

-- =============================================================================
-- Realtime: enable for collaborative tables
-- =============================================================================
alter publication supabase_realtime add table public.group_assignments;
alter publication supabase_realtime add table public.group_meetings;
alter publication supabase_realtime add table public.group_checklist;
alter publication supabase_realtime add table public.group_activity;
alter publication supabase_realtime add table public.lesson_notes;
alter publication supabase_realtime add table public.member_availability;
