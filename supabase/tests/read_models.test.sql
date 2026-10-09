begin;
\ir _helpers.psql
select plan(17);

select tests.create_user('rm-owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('rm-owner-s@test.local', 'dealer') as owner_s \gset
select tests.create_user('rm-admin@test.local', 'admin') as admin \gset
select tests.create_dealer('rm-dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('rm-dealer-s', 'approved', :'owner_s') as dealer_s \gset

-- dealer A: two live sedans (one reserved), one SUV with a feature, one draft
select tests.create_vehicle(:'dealer_a', 'active') as a_sedan \gset
select tests.create_vehicle(:'dealer_a', 'reserved') as a_reserved \gset
select tests.create_vehicle(:'dealer_a', 'active') as a_suv \gset
select tests.create_vehicle(:'dealer_a', 'draft') as a_draft \gset
update public.vehicles set body_type = 'suv', fuel_type = 'hybrid', exterior_color = 'White', year = 2024
  where id = :'a_suv';
insert into public.vehicle_features (vehicle_id, feature_id)
  select :'a_suv', id from public.features order by id limit 1;
select slug as feature_slug from public.features order by id limit 1 \gset
-- price drop on the sedan
update public.vehicles set price_cents = 2399000 where id = :'a_sedan';

-- dealer S has a live listing, then gets suspended
select tests.create_vehicle(:'dealer_s', 'active') as s_active \gset
update public.dealers set status = 'suspended' where id = :'dealer_s';

-- vehicle_cards
select tests.authenticate_as_anon();
select set_eq(
  format($$select id from public.vehicle_cards where dealer_id in (%L, %L)$$, :'dealer_a', :'dealer_s'),
  format($$values (%L::uuid), (%L::uuid), (%L::uuid)$$, :'a_sedan', :'a_reserved', :'a_suv'),
  'anon sees only live cards of approved dealers (view is security_invoker)'
);
select is(
  (select previous_price_cents from public.vehicle_cards where id = :'a_sedan'), 2599000::bigint,
  'card exposes the previous price after a reduction'
);
select is(
  (select previous_price_cents from public.vehicle_cards where id = :'a_reserved'), null::bigint,
  'no previous price without a reduction'
);
select ok(
  (select cover_path is not null and image_count = 1 and make_name is not null and dealer_slug = 'rm-dealer-a'
   from public.vehicle_cards where id = :'a_sedan'),
  'card joins cover photo, make and dealer'
);
select is(
  (select feature_slugs from public.vehicle_cards where id = :'a_suv'), array[:'feature_slug'],
  'card lists feature slugs'
);
select ok(
  not has_table_privilege('anon', 'public.vehicle_cards', 'INSERT, UPDATE, DELETE'),
  'anon has no write privileges on the view'
);

select tests.authenticate_as(:'owner_a');
select is(
  (select count(*)::int from public.vehicle_cards where dealer_id = :'dealer_a'), 4,
  'members see their own drafts through the view'
);
select ok(
  not has_table_privilege('authenticated', 'public.vehicle_cards', 'INSERT, UPDATE, DELETE'),
  'authenticated has no write privileges on the view'
);

-- get_inventory_facets (scoped to the fixture dealer so seed data does not interfere)
select tests.authenticate_as_anon();
select is(
  (public.get_inventory_facets('{"dealer":"rm-dealer-a"}') ->> 'total')::int, 3,
  'anon: total counts live listings only (no drafts)'
);
select is(
  public.get_inventory_facets('{"dealer":"rm-dealer-a"}') -> 'body',
  '[{"value":"sedan","count":2},{"value":"suv","count":1}]'::jsonb,
  'body facet counts'
);
select is(
  public.get_inventory_facets('{"dealer":"rm-dealer-a","body":["suv"]}') -> 'body',
  '[{"value":"sedan","count":2},{"value":"suv","count":1}]'::jsonb,
  'a facet ignores its own filter'
);
select is(
  public.get_inventory_facets('{"dealer":"rm-dealer-a","body":["suv"]}') -> 'fuel',
  '[{"value":"hybrid","count":1}]'::jsonb,
  'other facets apply the selected filter'
);
select is(
  (public.get_inventory_facets(format('{"dealer":"rm-dealer-a","feature":["%s"]}', :'feature_slug')::jsonb) ->> 'total')::int,
  1, 'feature filter requires all listed features'
);
select is(
  (public.get_inventory_facets('{"dealer":"rm-dealer-a","year_min":2023,"price_max_cents":2500000}') ->> 'total')::int,
  0, 'range filters combine'
);
select is(
  (public.get_inventory_facets('{"dealer":"rm-dealer-a","make":"not-an-array","year_min":"x","q":"   "}') ->> 'total')::int,
  3, 'malformed filter values are ignored, not errors'
);

select tests.authenticate_as(:'admin');
select is(
  (public.get_inventory_facets('{"dealer":"rm-dealer-s"}') ->> 'total')::int, 0,
  'admins do not see suspended dealers listings in storefront facets'
);
select tests.authenticate_as(:'owner_a');
select is(
  (public.get_inventory_facets('{"dealer":"rm-dealer-a"}') ->> 'total')::int, 3,
  'members do not see their drafts in storefront facets'
);

select tests.clear_authentication();
select * from finish();
rollback;
