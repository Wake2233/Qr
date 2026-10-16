begin;
\ir _helpers.psql
select plan(10);

select tests.create_user('ho-owner@test.local', 'dealer') as owner \gset
select tests.create_user('ho-admin@test.local', 'admin') as admin \gset
select tests.create_dealer('ho-dealer', 'approved', :'owner') as dealer \gset
select tests.create_vehicle(:'dealer', 'active') as a \gset
select tests.create_vehicle(:'dealer', 'active') as b \gset
select tests.create_vehicle(:'dealer', 'active') as c \gset

-- Start from a known state: nothing pinned.
update public.vehicles set is_featured = false where is_featured;

select tests.authenticate_as(:'owner');
select throws_ok(
  format($$select public.set_home_order(array[%L]::uuid[])$$, :'a'),
  'P0001', 'FORBIDDEN: only admins can arrange the home page',
  'dealers cannot arrange the home page'
);
select tests.authenticate_as_anon();
select throws_ok(
  format($$select public.set_home_order(array[%L]::uuid[])$$, :'a'),
  '42501', null, 'anon cannot call set_home_order'
);

select tests.authenticate_as(:'admin');
select is(
  public.set_home_order(array[:'c', :'a']::uuid[]), 2, 'admin pins two listings'
);
select results_eq(
  format($$select id from public.vehicles where id in (%L, %L, %L) and is_featured order by home_position$$, :'a', :'b', :'c'),
  format($$values (%L::uuid), (%L::uuid)$$, :'c', :'a'),
  'pinned in the given order (#1 = spotlight)'
);
select results_eq(
  format($$select home_position from public.vehicle_cards where id = %L$$, :'c'),
  $$values (1::smallint)$$,
  'vehicle_cards exposes the position'
);

-- Toggling the pin directly appends / clears.
update public.vehicles set is_featured = true where id = :'b';
select is(
  (select home_position from public.vehicles where id = :'b'), 3::smallint,
  'pinning appends to the end'
);
update public.vehicles set is_featured = false where id = :'c';
select is(
  (select home_position from public.vehicles where id = :'c'), null::smallint,
  'unpinning clears the position'
);

select is(
  public.set_home_order(array[:'b']::uuid[]), 1, 'a new order unpins the rest'
);
select is(
  (select is_featured from public.vehicles where id = :'a'), false, 'left-out listings are unpinned'
);

select tests.authenticate_as(:'owner');
select throws_ok(
  format($$update public.vehicles set is_featured = true where id = %L$$, :'a'),
  'P0001', 'FORBIDDEN: only admins can feature listings',
  'dealers still cannot pin their own listings'
);

select tests.clear_authentication();
select * from finish();
rollback;
