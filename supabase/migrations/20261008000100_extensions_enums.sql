-- Extensions, private schema, enums and shared trigger helpers.

create extension if not exists pgcrypto with schema extensions;

-- Helper functions used by RLS policies and triggers live here; PostgREST does not expose it.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create type public.app_role as enum ('buyer', 'dealer', 'admin');
create type public.dealer_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.dealer_member_role as enum ('owner', 'manager', 'staff');
create type public.listing_status as enum ('draft', 'pending_review', 'active', 'reserved', 'sold', 'archived');
create type public.vehicle_condition as enum ('new', 'used', 'certified');
create type public.body_type as enum ('sedan', 'suv', 'pickup', 'coupe', 'convertible', 'hatchback', 'wagon', 'van', 'minivan');
create type public.fuel_type as enum ('gasoline', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'flex_fuel');
create type public.drivetrain as enum ('fwd', 'rwd', 'awd', '4wd');
create type public.transmission as enum ('automatic', 'manual', 'cvt', 'dct');
create type public.title_status as enum ('clean', 'rebuilt', 'salvage', 'lemon', 'unknown');
create type public.feature_category as enum ('safety', 'comfort', 'technology', 'exterior', 'interior', 'performance');
create type public.lead_type as enum ('inquiry', 'test_drive', 'trade_in', 'finance');
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost');
create type public.contact_channel as enum ('whatsapp', 'call');
create type public.client_platform as enum ('web', 'ios', 'android');
create type public.credit_tier as enum ('excellent', 'good', 'fair', 'rebuilding');
create type public.finance_app_status as enum ('submitted', 'matching', 'offers_ready', 'in_review', 'withdrawn');

-- Keeps updated_at current on every UPDATE.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- E164 phone format, e.g. +13473700570.
create domain public.phone_e164 as text
  check (value ~ '^\+[1-9][0-9]{6,14}$');

-- URL-safe slug, e.g. 2021-bmw-x5-xdrive40i-1a2b3c4d.
create domain public.slug as text
  check (value ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(value) <= 120);
