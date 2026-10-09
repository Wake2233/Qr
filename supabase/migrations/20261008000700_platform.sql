-- Site-wide settings (single row), push tokens and the audit log.

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  brand_name text not null default 'Car Platform' check (char_length(brand_name) between 1 and 80),
  default_whatsapp_e164 public.phone_e164,
  default_phone_e164 public.phone_e164,
  whatsapp_template text not null
    default 'Hi! I''m interested in the {title} (Stock #{stock}) listed at {price}. {url}'
    check (char_length(whatsapp_template) <= 1000),
  business_hours jsonb not null default '{}'::jsonb,
  apr_by_tier jsonb not null default '{}'::jsonb,
  lender_network_size integer not null default 1200 check (lender_network_size >= 0),
  require_listing_review boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function private.set_updated_at();

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique check (char_length(token) <= 300),
  platform public.client_platform not null,
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create index push_tokens_user_id_idx on public.push_tokens (user_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_id_idx on public.audit_log (actor_id);
