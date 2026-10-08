begin;
\ir _helpers.psql
select plan(12);

select tests.create_user('owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('owner-b@test.local', 'dealer') as owner_b \gset
select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_user('buyer2@test.local') as buyer2 \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('fin-dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('fin-dealer-b', 'approved', :'owner_b') as dealer_b \gset

insert into public.finance_applications (
  id, user_id, dealer_id, first_name, last_name, email, phone_e164, postal_code, credit_tier,
  requested_amount_cents, term_months, consent_at, consent_text_version
) values
  ('33333333-3333-4333-8333-333333333333', :'buyer', :'dealer_a', 'Ana', 'Buyer', 'ana@test.local', '+12015550111', '08822', 'good', 2500000, 60, now(), 'v1'),
  ('44444444-4444-4444-8444-444444444444', null, :'dealer_b', 'Ben', 'Walkin', 'ben@test.local', '+12015550112', '08817', 'fair', 1800000, 72, now(), 'v1');
\set app_a '33333333-3333-4333-8333-333333333333'
\set app_b '44444444-4444-4444-8444-444444444444'
insert into public.lender_offers (application_id, lender_id, apr_bps, term_months, monthly_payment_cents, approved_amount_cents, expires_at)
select :'app_a', id, 699, 60, 49500, 2500000, now() + interval '30 days' from public.lenders order by name limit 2;
insert into public.lenders (name, base_apr_bps, active) values ('Inactive Test Lender', 999, false);

-- lenders
select tests.authenticate_as_anon();
select is((select count(*)::int from public.lenders where name = 'Inactive Test Lender'), 0, 'inactive lenders are hidden');
select ok((select count(*) from public.lenders) >= 40, 'anon can read the active lender network');

-- applications
select is((select count(*)::int from public.finance_applications), 0, 'anon cannot read applications');
select tests.authenticate_as(:'buyer');
select is((select count(*)::int from public.finance_applications), 1, 'applicant sees own application');
select is((select count(*)::int from public.lender_offers), 2, 'applicant sees own offers');
select throws_ok(
  format($$insert into public.finance_applications (dealer_id, first_name, last_name, email, phone_e164, postal_code,
           credit_tier, requested_amount_cents, term_months, consent_at, consent_text_version)
           values (%L, 'a', 'b', 'a@test.local', '+12015550113', '1', 'good', 1, 12, now(), 'v1')$$, :'dealer_a'),
  '42501', null, 'applications are created through the RPC only'
);
select tests.authenticate_as(:'buyer2');
select is((select count(*)::int from public.finance_applications), 0, 'other buyers see nothing');

select tests.authenticate_as(:'owner_a');
select is((select count(*)::int from public.finance_applications where id in (:'app_a', :'app_b')), 1, 'dealer sees own dealer applications');
select results_eq(
  format($$with u as (update public.finance_applications set status = 'in_review' where id = %L returning 1) select count(*)::int from u$$, :'app_a'),
  $$values (1)$$, 'dealer can update application status'
);
select throws_ok(
  format($$update public.finance_applications set requested_amount_cents = 1 where id = %L$$, :'app_a'),
  '42501', null, 'applicant financials are immutable for dealers'
);
select tests.authenticate_as(:'owner_b');
select is((select count(*)::int from public.lender_offers where application_id = :'app_a'), 0, 'other dealers cannot see offers');

select tests.authenticate_as(:'admin');
select is((select count(*)::int from public.finance_applications where id in (:'app_a', :'app_b')), 2, 'admin sees all applications');

select * from finish();
rollback;
