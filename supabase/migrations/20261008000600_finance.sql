-- Simulated financing: lender network, pre-qualification applications and offers.
-- No SSN or full date of birth is ever stored.

create table public.lenders (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  logo_path text,
  min_credit_tier public.credit_tier not null default 'good',
  base_apr_bps integer not null check (base_apr_bps between 0 and 4000),
  max_term_months smallint not null default 72 check (max_term_months between 12 and 96),
  max_ltv_pct smallint not null default 120 check (max_ltv_pct between 50 and 200),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.lenders enable row level security;

create table public.finance_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  status public.finance_app_status not null default 'submitted',
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone_e164 public.phone_e164 not null,
  postal_code text not null check (char_length(postal_code) <= 20),
  employment_status text check (employment_status in ('employed', 'self_employed', 'retired', 'student', 'other')),
  monthly_income_cents bigint check (monthly_income_cents >= 0),
  housing_payment_cents bigint check (housing_payment_cents >= 0),
  credit_tier public.credit_tier not null,
  down_payment_cents bigint not null default 0 check (down_payment_cents >= 0),
  trade_in_value_cents bigint not null default 0 check (trade_in_value_cents >= 0),
  requested_amount_cents bigint not null check (requested_amount_cents > 0),
  term_months smallint not null check (term_months between 12 and 96),
  consent_at timestamptz not null,
  consent_text_version text not null,
  -- Lets anonymous applicants view their own offers via get_finance_offers().
  access_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.finance_applications enable row level security;
create index finance_applications_dealer_idx on public.finance_applications (dealer_id, created_at desc);
create index finance_applications_user_id_idx on public.finance_applications (user_id);
create index finance_applications_vehicle_id_idx on public.finance_applications (vehicle_id);
create trigger finance_applications_set_updated_at before update on public.finance_applications
  for each row execute function private.set_updated_at();

create table public.lender_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.finance_applications (id) on delete cascade,
  lender_id uuid not null references public.lenders (id) on delete cascade,
  apr_bps integer not null check (apr_bps between 0 and 4000),
  term_months smallint not null check (term_months between 12 and 96),
  monthly_payment_cents bigint not null check (monthly_payment_cents > 0),
  approved_amount_cents bigint not null check (approved_amount_cents > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.lender_offers enable row level security;
create index lender_offers_application_idx on public.lender_offers (application_id);
create index lender_offers_lender_id_idx on public.lender_offers (lender_id);
