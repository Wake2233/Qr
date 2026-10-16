begin;
\ir _helpers.psql
select plan(24);

select tests.create_user('fc-owner@test.local', 'dealer') as owner \gset
select tests.create_dealer('fc-empty', 'approved', :'owner') as dealer_empty \gset
select tests.create_dealer('fc-dealer', 'approved', :'owner') as dealer \gset

-- Three live cars: a clean one-owner Chevrolet, a damaged non-runner, and an EV (no displacement).
select tests.create_vehicle(:'dealer', 'active') as clean \gset
select tests.create_vehicle(:'dealer', 'active') as damaged \gset
select tests.create_vehicle(:'dealer', 'active') as ev \gset
update public.vehicles v set
  make_id = md.make_id, model_id = md.id, exterior_color = 'Summit White', displacement_l = 2.0,
  damage = 'none', drive_status = 'runs_and_drives', owners_count = 1, accident_free = true,
  title_status = 'clean', service_records = true
from public.models md join public.makes mk on mk.id = md.make_id
where v.id = :'clean' and mk.slug = 'chevrolet' and md.slug = 'malibu';
update public.vehicles set
  exterior_color = 'Graphite Metallic', displacement_l = 3.5, damage = 'moderate', damage_area = 'front',
  drive_status = 'does_not_start', owners_count = 2, accident_free = false, title_status = 'salvage'
where id = :'damaged';
update public.vehicles set exterior_color = 'Deep Ocean', fuel_type = 'electric', displacement_l = null
where id = :'ev';

-- Color family
select is(private.color_family('Alpine White'), 'white'::public.color_family, 'paint name with a base color');
select is(private.color_family('Graphite Metallic'), 'gray'::public.color_family, 'descriptive gray name');
select is(private.color_family('Deep Ocean'), 'blue'::public.color_family, 'descriptive blue name');
select is(private.color_family('Tuxedo'), 'other'::public.color_family, 'unknown names fall back to other');
select is(
  (select exterior_color_family from public.vehicles where id = :'clean'), 'white'::public.color_family,
  'trigger derives the family on write'
);
update public.vehicles set exterior_color_family = 'purple' where id = :'clean';
select is(
  (select exterior_color_family from public.vehicles where id = :'clean'), 'white'::public.color_family,
  'a written family is always recomputed'
);

-- Column grants: members can edit the new fields, never the derived color family
select ok(
  has_column_privilege('authenticated', 'public.vehicles', 'drive_status', 'UPDATE')
    and has_column_privilege('authenticated', 'public.vehicles', 'damage', 'UPDATE')
    and has_column_privilege('authenticated', 'public.vehicles', 'damage_area', 'UPDATE')
    and has_column_privilege('authenticated', 'public.vehicles', 'service_records', 'UPDATE'),
  'members can update the condition columns'
);
select ok(
  not has_column_privilege('authenticated', 'public.vehicles', 'exterior_color_family', 'UPDATE'),
  'the color family is not client-writable'
);

-- Full option lists, even with nothing in stock
select tests.authenticate_as_anon();
select is(
  jsonb_array_length(public.get_inventory_facets('{"dealer":"fc-empty"}') -> 'make'),
  (select count(*)::int from public.makes), 'every make is listed with no stock'
);
select is(
  jsonb_path_query_array(public.get_inventory_facets('{"dealer":"fc-empty"}'), '$.make[*] ? (@.count > 0)'),
  '[]'::jsonb, 'empty inventory: every make count is 0'
);
select is(
  jsonb_array_length(public.get_inventory_facets('{"dealer":"fc-empty"}') -> 'damage'), 4,
  'every enum value is listed'
);
select is(
  jsonb_array_length(public.get_inventory_facets('{"dealer":"fc-empty"}') -> 'feature'),
  (select count(*)::int from public.features), 'every feature is listed'
);
select is(
  jsonb_array_length(public.get_inventory_facets('{"dealer":"fc-empty"}') -> 'model'), 0,
  'without a make, only models in stock are listed'
);
select is(
  jsonb_array_length(public.get_inventory_facets('{"dealer":"fc-empty","make":["toyota"]}') -> 'model'),
  (select count(*)::int from public.models md join public.makes mk on mk.id = md.make_id where mk.slug = 'toyota'),
  'with a make, all its catalog models are listed'
);

-- New filters
select is(
  (public.get_inventory_facets('{"dealer":"fc-dealer","damage":["none"]}') ->> 'total')::int, 1, 'damage filter'
);
select is(
  (public.get_inventory_facets('{"dealer":"fc-dealer","drive_status":["does_not_start"]}') ->> 'total')::int, 1,
  'run & drive filter'
);
select is(
  (public.get_inventory_facets('{"dealer":"fc-dealer","title":["salvage"],"damage_area":["front"]}') ->> 'total')::int, 1,
  'title and primary damage filters combine'
);
select is(
  (public.get_inventory_facets('{"dealer":"fc-dealer","engine_min_l":1.5,"engine_max_l":2.5}') ->> 'total')::int, 1,
  'engine size range (EVs have no displacement)'
);
select is(
  (public.get_inventory_facets('{"dealer":"fc-dealer","color":["gray"]}') ->> 'total')::int, 1,
  'color filter uses the family'
);
select is(
  (public.get_inventory_facets('{"dealer":"fc-dealer","history":["clean_history","one_owner"]}') ->> 'total')::int, 1,
  'history flags all have to hold'
);
select is(
  public.get_inventory_facets('{"dealer":"fc-dealer","history":["clean_history"]}') -> 'history',
  '[{"value":"no_accidents","count":1},{"value":"one_owner","count":1},{"value":"service_records","count":1},{"value":"clean_history","count":1}]'::jsonb,
  'history counts ignore the history filter itself'
);
select is(
  jsonb_path_query_array(public.get_inventory_facets('{"dealer":"fc-dealer","damage":["none"]}'), '$.damage[*] ? (@.count > 0)'),
  '[{"value":"none","count":1},{"value":"moderate","count":1}]'::jsonb,
  'a facet ignores its own filter'
);
select ok(
  (select (e ->> 'min')::numeric <= 2.0 and (e ->> 'max')::numeric >= 3.5
   from (select public.get_inventory_facets('{"dealer":"fc-dealer"}') -> 'engine' as e) t),
  'engine size range spans live listings (like price and year)'
);

-- Make nicknames
select is(
  (public.get_inventory_facets('{"dealer":"fc-dealer","q":"chevy"}') ->> 'total')::int, 1,
  'search finds Chevrolet by "chevy"'
);

select tests.clear_authentication();
select * from finish();
rollback;
