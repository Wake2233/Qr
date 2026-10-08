-- Profiles (1:1 with auth.users), dealers and dealer membership.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone public.phone_e164,
  avatar_url text check (char_length(avatar_url) <= 2048),
  role public.app_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create index profiles_role_idx on public.profiles (role) where role <> 'buyer';
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create a profile for every new auth user.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  slug public.slug not null unique,
  display_name text not null check (char_length(display_name) between 2 and 120),
  legal_name text check (char_length(legal_name) <= 200),
  status public.dealer_status not null default 'pending',
  is_house boolean not null default false,
  logo_path text,
  phone_e164 public.phone_e164,
  whatsapp_e164 public.phone_e164,
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website text check (char_length(website) <= 300),
  address_line1 text check (char_length(address_line1) <= 200),
  city text check (char_length(city) <= 100),
  state text check (char_length(state) <= 50),
  postal_code text check (char_length(postal_code) <= 20),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  description text check (char_length(description) <= 4000),
  business_hours jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dealers enable row level security;
-- Exactly one house dealership (the platform owner).
create unique index dealers_single_house_idx on public.dealers ((true)) where is_house;
create index dealers_status_idx on public.dealers (status);
create index dealers_approved_by_idx on public.dealers (approved_by);
create index dealers_created_by_idx on public.dealers (created_by);
create trigger dealers_set_updated_at before update on public.dealers
  for each row execute function private.set_updated_at();

-- Sensitive dealer data, visible only to its members and admins.
create table public.dealer_private (
  dealer_id uuid primary key references public.dealers (id) on delete cascade,
  license_number text check (char_length(license_number) <= 100),
  tax_id_last4 text check (tax_id_last4 ~ '^[0-9]{4}$'),
  documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.dealer_private enable row level security;
create trigger dealer_private_set_updated_at before update on public.dealer_private
  for each row execute function private.set_updated_at();

create table public.dealer_members (
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.dealer_member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (dealer_id, user_id)
);
alter table public.dealer_members enable row level security;
-- Every RLS membership check filters by user_id.
create index dealer_members_user_id_idx on public.dealer_members (user_id);
