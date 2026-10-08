-- Vehicle listings, images, features, price history and VIN decode cache.
-- Filterable attributes are typed columns; VIN-decoded extras go in `specs`.

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  slug public.slug unique,
  stock_number text check (char_length(stock_number) <= 40),
  vin text check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  make_id smallint not null references public.makes (id) on delete restrict,
  model_id integer not null references public.models (id) on delete restrict,
  year smallint not null check (year between 1950 and 2100),
  trim text check (char_length(trim) <= 80),
  condition public.vehicle_condition not null default 'used',
  body_type public.body_type,
  mileage integer check (mileage >= 0),
  price_cents bigint check (price_cents > 0),
  msrp_cents bigint check (msrp_cents > 0),
  exterior_color text check (char_length(exterior_color) <= 40),
  interior_color text check (char_length(interior_color) <= 40),
  fuel_type public.fuel_type,
  drivetrain public.drivetrain,
  transmission public.transmission,
  engine text check (char_length(engine) <= 80),
  cylinders smallint check (cylinders between 0 and 16),
  displacement_l numeric(3, 1) check (displacement_l > 0),
  horsepower smallint check (horsepower > 0),
  torque_lbft smallint check (torque_lbft > 0),
  mpg_city smallint check (mpg_city > 0),
  mpg_highway smallint check (mpg_highway > 0),
  ev_range_mi smallint check (ev_range_mi > 0),
  doors smallint check (doors between 1 and 6),
  seats smallint check (seats between 1 and 15),
  owners_count smallint check (owners_count >= 0),
  accident_free boolean,
  title_status public.title_status not null default 'clean',
  description text check (char_length(description) <= 10000),
  specs jsonb not null default '{}'::jsonb,
  status public.listing_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  sold_at timestamptz,
  search_vector tsvector,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dealer_id, stock_number)
);
alter table public.vehicles enable row level security;

-- A VIN can only be listed once at a time (archived listings don't count).
create unique index vehicles_vin_live_idx on public.vehicles (vin)
  where vin is not null and status <> 'archived';
create index vehicles_dealer_status_idx on public.vehicles (dealer_id, status);
create index vehicles_make_model_idx on public.vehicles (make_id, model_id);
create index vehicles_model_id_idx on public.vehicles (model_id);
create index vehicles_status_published_idx on public.vehicles (status, published_at desc);
create index vehicles_status_price_idx on public.vehicles (status, price_cents);
create index vehicles_status_year_idx on public.vehicles (status, year);
create index vehicles_status_mileage_idx on public.vehicles (status, mileage);
create index vehicles_active_price_idx on public.vehicles (price_cents) where status = 'active';
create index vehicles_body_type_idx on public.vehicles (body_type);
create index vehicles_fuel_type_idx on public.vehicles (fuel_type);
create index vehicles_drivetrain_idx on public.vehicles (drivetrain);
create index vehicles_search_idx on public.vehicles using gin (search_vector);
create index vehicles_created_by_idx on public.vehicles (created_by);
create trigger vehicles_set_updated_at before update on public.vehicles
  for each row execute function private.set_updated_at();

create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 500),
  position smallint not null check (position >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  blurhash text check (char_length(blurhash) <= 100),
  alt text check (char_length(alt) <= 200),
  created_at timestamptz not null default now(),
  -- Deferrable so reorder_vehicle_images can swap positions in one transaction.
  constraint vehicle_images_position_key unique (vehicle_id, position) deferrable initially immediate
);
alter table public.vehicle_images enable row level security;

create table public.vehicle_features (
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  feature_id smallint not null references public.features (id) on delete cascade,
  primary key (vehicle_id, feature_id)
);
alter table public.vehicle_features enable row level security;
create index vehicle_features_feature_id_idx on public.vehicle_features (feature_id);

create table public.vehicle_price_history (
  id bigint generated always as identity primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  old_price_cents bigint,
  new_price_cents bigint,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.vehicle_price_history enable row level security;
create index vehicle_price_history_vehicle_idx on public.vehicle_price_history (vehicle_id, changed_at desc);
create index vehicle_price_history_changed_by_idx on public.vehicle_price_history (changed_by);

create table public.vin_decodes (
  vin text primary key check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  payload jsonb not null,
  decoded_at timestamptz not null default now()
);
alter table public.vin_decodes enable row level security;
