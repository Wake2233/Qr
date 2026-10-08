begin;
\ir _helpers.psql
select plan(18);

select tests.create_user('owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('owner-b@test.local', 'dealer') as owner_b \gset
select tests.create_user('pending@test.local') as pending_owner \gset
select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('veh-dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('veh-dealer-b', 'approved', :'owner_b') as dealer_b \gset
select tests.create_dealer('veh-dealer-p', 'pending', :'pending_owner') as dealer_p \gset

select tests.create_vehicle(:'dealer_a', 'active') as a_active \gset
select tests.create_vehicle(:'dealer_a', 'draft') as a_draft \gset
select tests.create_vehicle(:'dealer_a', 'sold') as a_sold_recent \gset
select tests.create_vehicle(:'dealer_a', 'sold') as a_sold_old \gset
select tests.create_vehicle(:'dealer_b', 'active') as b_active \gset
select tests.create_vehicle(:'dealer_p', 'draft') as p_draft \gset
update public.vehicles set sold_at = now() - interval '45 days' where id = :'a_sold_old';

create temporary table fixture_ids on commit drop as
  select unnest(array[:'a_active', :'a_draft', :'a_sold_recent', :'a_sold_old', :'b_active', :'p_draft']::uuid[]) as id;
grant select on fixture_ids to anon, authenticated;

-- public visibility
select tests.authenticate_as_anon();
select set_eq(
  $$select id from public.vehicles where id in (select id from fixture_ids)$$,
  format($$values (%L::uuid), (%L::uuid), (%L::uuid)$$, :'a_active', :'a_sold_recent', :'b_active'),
  'anon sees active + recently sold listings of approved dealers only'
);
select tests.authenticate_as(:'buyer');
select is(
  (select count(*)::int from public.vehicles where id in (select id from fixture_ids)), 3,
  'buyer sees the same public listings'
);

-- members
select tests.authenticate_as(:'owner_a');
select is(
  (select count(*)::int from public.vehicles where dealer_id = :'dealer_a'), 4,
  'dealer sees all own inventory incl. drafts and old sold'
);
select is((select count(*)::int from public.vehicles where id = :'p_draft'), 0, 'dealer cannot see other dealers drafts');
select lives_ok(
  format($$insert into public.vehicles (dealer_id, make_id, model_id, year, created_by)
           select %L, make_id, id, 2020, %L from public.models order by id limit 1$$, :'dealer_a', :'owner_a'),
  'dealer can create a draft for own dealer'
);
select throws_ok(
  format($$insert into public.vehicles (dealer_id, make_id, model_id, year, created_by)
           select %L, make_id, id, 2020, %L from public.models order by id limit 1$$, :'dealer_b', :'owner_a'),
  '42501', null, 'dealer cannot create vehicles for another dealer'
);
select throws_ok(
  format($$insert into public.vehicles (dealer_id, make_id, model_id, year, created_by)
           select %L, make_id, id, 2020, %L from public.models order by id limit 1$$, :'dealer_a', :'owner_b'),
  '42501', null, 'created_by cannot be spoofed'
);
select results_eq(
  format($$with u as (update public.vehicles set price_cents = 1999000 where id = %L returning 1) select count(*)::int from u$$, :'a_active'),
  $$values (1)$$, 'dealer can edit own vehicle price'
);
select results_eq(
  format($$with u as (update public.vehicles set price_cents = 100 where id = %L returning 1) select count(*)::int from u$$, :'b_active'),
  $$values (0)$$, 'dealer cannot edit another dealers vehicle'
);
select throws_ok(
  format($$update public.vehicles set published_at = now() where id = %L$$, :'a_active'),
  '42501', null, 'published_at is trigger-managed (column grant)'
);
select results_eq(
  format($$with d as (delete from public.vehicles where id = %L returning 1) select count(*)::int from d$$, :'a_draft'),
  $$values (0)$$, 'dealers cannot hard-delete (archive instead)'
);
select throws_ok(
  format($$update public.vehicles set dealer_id = %L where id = %L$$, :'dealer_b', :'a_draft'),
  '42501', null, 'dealer cannot move a vehicle to another dealer'
);

-- anon writes
select tests.authenticate_as_anon();
select throws_ok(
  format($$update public.vehicles set price_cents = 1 where id = %L$$, :'a_active'),
  '42501', null, 'anon cannot update vehicles'
);

-- admin
select tests.authenticate_as(:'admin');
select is((select count(*)::int from public.vehicles where id in (select id from fixture_ids)), 6, 'admin sees everything');
select results_eq(
  format($$with u as (update public.vehicles set is_featured = true where id = %L returning 1) select count(*)::int from u$$, :'b_active'),
  $$values (1)$$, 'admin can edit any vehicle'
);
select results_eq(
  format($$with d as (delete from public.vehicles where id = %L returning 1) select count(*)::int from d$$, :'a_draft'),
  $$values (1)$$, 'admin can hard-delete'
);

-- suspension hides inventory immediately
select tests.clear_authentication();
update public.dealers set status = 'suspended' where id = :'dealer_a';
select tests.authenticate_as_anon();
select is(
  (select count(*)::int from public.vehicles where dealer_id = :'dealer_a'), 0,
  'suspended dealer listings disappear from public view'
);
select tests.authenticate_as(:'owner_a');
select ok(
  (select count(*) from public.vehicles where dealer_id = :'dealer_a') > 0,
  'suspended dealer can still see own inventory'
);

select * from finish();
rollback;
