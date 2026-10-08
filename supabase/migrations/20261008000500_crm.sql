-- Buyer favorites, leads (CRM), lead timeline and conversion analytics.

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);
alter table public.favorites enable row level security;
create index favorites_vehicle_id_idx on public.favorites (vehicle_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  type public.lead_type not null default 'inquiry',
  status public.lead_status not null default 'new',
  name text not null check (char_length(name) between 1 and 120),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone_e164 public.phone_e164,
  message text check (char_length(message) <= 4000),
  preferred_contact text check (preferred_contact in ('whatsapp', 'call', 'email')),
  payload jsonb not null default '{}'::jsonb,
  source public.client_platform not null default 'web',
  assigned_to uuid references public.profiles (id) on delete set null,
  first_response_at timestamptz,
  utm jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone_e164 is not null)
);
alter table public.leads enable row level security;
create index leads_dealer_status_idx on public.leads (dealer_id, status, created_at desc);
create index leads_user_id_idx on public.leads (user_id);
create index leads_vehicle_id_idx on public.leads (vehicle_id);
create index leads_assigned_to_idx on public.leads (assigned_to);
create trigger leads_set_updated_at before update on public.leads
  for each row execute function private.set_updated_at();

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('note', 'status_change', 'assignment', 'whatsapp', 'call', 'email')),
  body text check (char_length(body) <= 4000),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.lead_activities enable row level security;
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);
create index lead_activities_author_id_idx on public.lead_activities (author_id);

create table public.contact_clicks (
  id bigint generated always as identity primary key,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  channel public.contact_channel not null,
  platform public.client_platform not null,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.contact_clicks enable row level security;
create index contact_clicks_created_at_brin on public.contact_clicks using brin (created_at);
create index contact_clicks_vehicle_id_idx on public.contact_clicks (vehicle_id);
create index contact_clicks_dealer_id_idx on public.contact_clicks (dealer_id, created_at desc);
create index contact_clicks_user_id_idx on public.contact_clicks (user_id);

-- Daily view counters (no PII).
create table public.vehicle_views (
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0 check (views >= 0),
  primary key (vehicle_id, day)
);
alter table public.vehicle_views enable row level security;
