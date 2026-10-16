-- Financing is out of scope (owner decision, 2026-10-16): no lenders, pre-qualification
-- applications, offers, APR table or payment estimates anywhere on the platform.
-- Leads keep the inquiry, test-drive and trade-in types.

drop table public.lender_offers;
drop table public.finance_applications;
drop table public.lenders;

-- site_settings.apr_by_tier / lender_network_size are dropped by a follow-up migration once the
-- app that no longer reads them is deployed (the previous release still selects them).

drop type public.finance_app_status;
drop type public.credit_tier;

-- Postgres cannot drop a single enum value, so lead_type is rebuilt without 'finance'.
-- (Fails loudly if any 'finance' lead exists; none do.)
alter type public.lead_type rename to lead_type_old;
create type public.lead_type as enum ('inquiry', 'test_drive', 'trade_in');
alter table public.leads alter column type drop default;
alter table public.leads
  alter column type type public.lead_type using type::text::public.lead_type;
alter table public.leads alter column type set default 'inquiry';
drop type public.lead_type_old;
