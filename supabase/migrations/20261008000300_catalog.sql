-- Normalized vehicle catalog: make -> model, plus a feature dictionary.

create table public.makes (
  id smallint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 60),
  slug public.slug not null unique,
  logo_path text,
  created_at timestamptz not null default now()
);
alter table public.makes enable row level security;

create table public.models (
  id integer generated always as identity primary key,
  make_id smallint not null references public.makes (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  slug public.slug not null,
  default_body_type public.body_type,
  created_at timestamptz not null default now(),
  unique (make_id, slug)
);
alter table public.models enable row level security;
create index models_make_id_idx on public.models (make_id);

create table public.features (
  id smallint generated always as identity primary key,
  name text not null unique check (char_length(name) between 1 and 80),
  slug public.slug not null unique,
  category public.feature_category not null,
  icon text,
  created_at timestamptz not null default now()
);
alter table public.features enable row level security;
create index features_category_idx on public.features (category);
