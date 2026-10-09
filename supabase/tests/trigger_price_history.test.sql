begin;
\ir _helpers.psql
select plan(8);

select tests.create_user('owner@test.local', 'dealer') as owner \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_dealer('price-dealer', 'approved', :'owner') as dealer \gset
select tests.create_vehicle(:'dealer', 'active') as vehicle \gset

select tests.authenticate_as(:'owner');
update public.vehicles set price_cents = 2499000 where id = :'vehicle';
update public.vehicles set mileage = 13000 where id = :'vehicle';

select tests.clear_authentication();
select is((select count(*)::int from public.vehicle_price_history where vehicle_id = :'vehicle'), 1,
  'only price changes create history rows');
select results_eq(
  format($$select old_price_cents, new_price_cents, changed_by from public.vehicle_price_history where vehicle_id = %L$$, :'vehicle'),
  format($$values (2599000::bigint, 2499000::bigint, %L::uuid)$$, :'owner'),
  'history records old/new price and the actor'
);
select ok(
  exists (select 1 from public.audit_log where entity = 'vehicles' and entity_id = :'vehicle'
          and actor_id = :'owner' and diff ? 'price_cents'),
  'price change is written to the audit log'
);

-- price history is public for live listings, read-only for everyone
select tests.authenticate_as_anon();
select is((select count(*)::int from public.vehicle_price_history where vehicle_id = :'vehicle'), 1,
  'anon can read price history of a live listing');
select tests.authenticate_as(:'owner');
select throws_ok(
  format($$insert into public.vehicle_price_history (vehicle_id, new_price_cents) values (%L, 1)$$, :'vehicle'),
  '42501', null, 'nobody writes price history directly'
);

-- audit log: admins only
select tests.authenticate_as(:'buyer');
select is((select count(*)::int from public.audit_log), 0, 'buyers cannot read the audit log');
select tests.authenticate_as(:'owner');
select is((select count(*)::int from public.audit_log), 0, 'dealers cannot read the audit log');
select tests.authenticate_as(:'admin');
select ok((select count(*) from public.audit_log where entity_id = :'vehicle') >= 1, 'admins can read the audit log');

select * from finish();
rollback;
