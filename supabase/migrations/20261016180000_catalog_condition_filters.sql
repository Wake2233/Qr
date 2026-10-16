-- Full filter catalog + condition/history fields.
-- * Condition & history columns on vehicles (damage, primary damage, run & drive, service records).
-- * Exterior color family, derived from the paint name ("Alpine White" -> white) for the color filter.
-- * Make nicknames in the search vector ("chevy", "vw", "benz").
-- * get_inventory_facets lists every option (all makes, enum values, features) with live counts,
--   so the filter rail is complete even when nothing is listed yet.

------------------------------------------------------------------------------
-- Enums + columns
------------------------------------------------------------------------------

create type public.damage_level as enum ('none', 'minor', 'moderate', 'severe');
create type public.damage_area as enum (
  'front', 'rear', 'side', 'roof', 'undercarriage', 'all_over',
  'hail', 'flood', 'fire', 'mechanical', 'vandalism', 'normal_wear'
);
create type public.drive_status as enum ('runs_and_drives', 'starts', 'does_not_start');
create type public.color_family as enum (
  'black', 'white', 'gray', 'silver', 'blue', 'red', 'green',
  'brown', 'beige', 'gold', 'orange', 'yellow', 'purple', 'other'
);

alter table public.vehicles
  add column damage public.damage_level,
  add column damage_area public.damage_area,
  add column drive_status public.drive_status,
  add column service_records boolean,
  add column exterior_color_family public.color_family;

comment on column public.vehicles.damage is 'Current damage level; null = not stated.';
comment on column public.vehicles.damage_area is 'Primary damage (auction-style); null = not stated or no damage.';
comment on column public.vehicles.drive_status is 'Run & Drive status; null = not stated.';
comment on column public.vehicles.exterior_color_family is 'Derived from exterior_color by trigger; powers the color filter.';

-- Members edit the new fields like every other spec (update is granted per column);
-- exterior_color_family is derived by trigger and stays read-only.
grant update (damage, damage_area, drive_status, service_records) on public.vehicles to authenticated;

create index vehicles_damage_idx on public.vehicles (damage);
create index vehicles_drive_status_idx on public.vehicles (drive_status);
create index vehicles_color_family_idx on public.vehicles (exterior_color_family);
create index vehicles_displacement_idx on public.vehicles (displacement_l);

------------------------------------------------------------------------------
-- Color family: base color words first, then common paint-name words.
------------------------------------------------------------------------------

create function private.color_family(p_color text)
returns public.color_family
language sql
immutable
set search_path = ''
as $$
  select case
    when c is null or c = '' then null
    when c ~ '\mwhite\M' then 'white'
    when c ~ '\mblack\M' then 'black'
    when c ~ '\msilver\M' then 'silver'
    when c ~ '\m(gray|grey)\M' then 'gray'
    when c ~ '\mblue\M' then 'blue'
    when c ~ '\mred\M' then 'red'
    when c ~ '\mgreen\M' then 'green'
    when c ~ '\mbrown\M' then 'brown'
    when c ~ '\m(beige|tan)\M' then 'beige'
    when c ~ '\mgold\M' then 'gold'
    when c ~ '\morange\M' then 'orange'
    when c ~ '\myellow\M' then 'yellow'
    when c ~ '\m(purple|violet)\M' then 'purple'
    when c ~ '\m(graphite|charcoal|gunmetal|slate|titanium|magnetite|granite|steel|ash|smoke|cement|nardo)\M' then 'gray'
    when c ~ '\m(platinum|chrome|quicksilver|sterling|argent)\M' then 'silver'
    when c ~ '\m(ivory|snow|pearl|alabaster|glacier|chalk|frost|polar|arctic|blizzard)\M' then 'white'
    when c ~ '\m(ebony|onyx|obsidian|jet|carbon|phantom|panther|raven|midnight)\M' then 'black'
    when c ~ '\m(navy|sapphire|cobalt|azure|indigo|aqua|cyan|ocean|marine)\M' then 'blue'
    when c ~ '\m(crimson|ruby|maroon|burgundy|scarlet|cherry|garnet|cardinal|wine|cayenne)\M' then 'red'
    when c ~ '\m(emerald|olive|jade|lime|forest|sage|army|teal|moss)\M' then 'green'
    when c ~ '\m(bronze|copper|mocha|chocolate|espresso|mahogany|caramel|chestnut|coffee|cocoa)\M' then 'brown'
    when c ~ '\m(sand|champagne|cream|khaki|desert|almond|taupe|cashmere|dune)\M' then 'beige'
    when c ~ '\m(amber|honey)\M' then 'gold'
    when c ~ '\m(tangerine|sunset|lava|blaze)\M' then 'orange'
    when c ~ '\m(lemon|canary|mustard|sunshine)\M' then 'yellow'
    when c ~ '\m(plum|lavender|amethyst|lilac|grape|magenta)\M' then 'purple'
    else 'other'
  end::public.color_family
  from (select lower(trim(p_color)) as c) t;
$$;

revoke all on function private.color_family(text) from public;
grant execute on function private.color_family(text) to anon, authenticated, service_role;

create function private.vehicles_set_color_family()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Always derived: a client-supplied value is overwritten.
  new.exterior_color_family := private.color_family(new.exterior_color);
  return new;
end;
$$;

create trigger vehicles_set_color_family
  before insert or update on public.vehicles
  for each row execute function private.vehicles_set_color_family();

------------------------------------------------------------------------------
-- Search: make nicknames and common misspellings
------------------------------------------------------------------------------

create function private.make_aliases(p_make text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(coalesce(p_make, ''))
    when 'chevrolet' then 'chevy'
    when 'volkswagen' then 'vw'
    when 'mercedes-benz' then 'benz merc mb'
    when 'bmw' then 'bimmer beemer'
    when 'land rover' then 'landrover'
    when 'cadillac' then 'caddy'
    when 'hyundai' then 'hundai'
    when 'porsche' then 'porshe'
    when 'infiniti' then 'infinity'
    when 'mini' then 'mini cooper'
    else ''
  end;
$$;

revoke all on function private.make_aliases(text) from public;

create or replace function private.vehicle_search_vector(
  p_year int, p_make text, p_model text, p_trim text, p_color text,
  p_body text, p_fuel text, p_description text
)
returns tsvector
language sql
immutable
set search_path = ''
as $$
  select
    setweight(to_tsvector('simple', concat_ws(' ',
      p_year, private.search_words(p_make), private.make_aliases(p_make),
      private.search_words(p_model), replace(private.search_words(p_model), ' ', ''))), 'A')
    || setweight(to_tsvector('simple', concat_ws(' ',
      private.search_words(p_trim), replace(private.search_words(p_trim), ' ', ''))), 'B')
    || setweight(to_tsvector('simple', private.search_words(concat_ws(' ', p_color, p_body, p_fuel))), 'C')
    || setweight(to_tsvector('english', coalesce(p_description, '')), 'D');
$$;

-- Backfill: the write triggers recompute the color family and the search vector.
-- Price and status are unchanged, so no price history or audit rows are written.
update public.vehicles set exterior_color = exterior_color;

------------------------------------------------------------------------------
-- Feature labels: brand names in the generic feature (slugs unchanged)
------------------------------------------------------------------------------

update public.features set name = 'Adaptive Cruise Control (DISTRONIC, ACC)'
  where slug = 'adaptive-cruise-control';
update public.features set name = 'Panoramic Sunroof / Moonroof'
  where slug = 'panoramic-moonroof';
update public.features set name = 'Sunroof / Moonroof'
  where slug = 'sunroof';

------------------------------------------------------------------------------
-- vehicle_cards: append the filterable condition/history columns
------------------------------------------------------------------------------

create or replace view public.vehicle_cards
with (security_invoker = true)
as
select
  v.id,
  v.slug,
  v.dealer_id,
  v.status,
  v.is_featured,
  v.condition,
  v.year,
  v.make_id,
  mk.name as make_name,
  mk.slug as make_slug,
  v.model_id,
  md.name as model_name,
  md.slug as model_slug,
  v.trim,
  v.body_type,
  v.fuel_type,
  v.drivetrain,
  v.transmission,
  v.mileage,
  v.price_cents,
  v.msrp_cents,
  v.exterior_color,
  v.seats,
  v.mpg_city,
  v.mpg_highway,
  v.ev_range_mi,
  v.stock_number,
  v.published_at,
  v.sold_at,
  v.created_at,
  v.search_vector,
  d.display_name as dealer_name,
  d.slug as dealer_slug,
  d.status as dealer_status,
  d.is_house as dealer_is_house,
  cover.storage_path as cover_path,
  cover.blurhash as cover_blurhash,
  cover.alt as cover_alt,
  cover.width as cover_width,
  cover.height as cover_height,
  (select count(*)::int from public.vehicle_images vi where vi.vehicle_id = v.id) as image_count,
  array(
    select f.slug::text
    from public.vehicle_features vf
    join public.features f on f.id = vf.feature_id
    where vf.vehicle_id = v.id
    order by f.slug
  ) as feature_slugs,
  -- Last price change, only when it was a reduction to the current price.
  case
    when last_change.old_price_cents > last_change.new_price_cents
      and last_change.new_price_cents = v.price_cents
    then last_change.old_price_cents
  end as previous_price_cents,
  case
    when last_change.old_price_cents > last_change.new_price_cents
      and last_change.new_price_cents = v.price_cents
    then last_change.changed_at
  end as price_dropped_at,
  v.vin,
  v.updated_at,
  v.displacement_l,
  v.damage,
  v.damage_area,
  v.drive_status,
  v.title_status,
  v.accident_free,
  v.owners_count,
  v.service_records,
  v.exterior_color_family
from public.vehicles v
join public.makes mk on mk.id = v.make_id
join public.models md on md.id = v.model_id
left join public.dealers d on d.id = v.dealer_id
left join lateral (
  select vi.storage_path, vi.blurhash, vi.alt, vi.width, vi.height
  from public.vehicle_images vi
  where vi.vehicle_id = v.id
  order by vi.position
  limit 1
) cover on true
left join lateral (
  select ph.old_price_cents, ph.new_price_cents, ph.changed_at
  from public.vehicle_price_history ph
  where ph.vehicle_id = v.id
  order by ph.changed_at desc, ph.id desc
  limit 1
) last_change on true;

------------------------------------------------------------------------------
-- get_inventory_facets: every option, with live counts
------------------------------------------------------------------------------

-- jsonb number -> numeric (null for missing or non-numeric input).
create function private.jsonb_numeric(p_value jsonb)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(p_value) = 'number' then (p_value #>> '{}')::numeric end;
$$;

revoke all on function private.jsonb_numeric(jsonb) from public;
grant execute on function private.jsonb_numeric(jsonb) to anon, authenticated, service_role;

/*
  Facet counts for the storefront filter rail. Each facet's counts apply every filter
  except its own, so selecting "BMW" still shows how many Audis match the other filters.
  Every option is listed (count 0 when nothing matches): all makes, all enum values, all
  features. Models: every catalog model of the selected makes, otherwise only models in stock.

  p_filters keys (all optional): q, make[], model[], body[], fuel[], drivetrain[],
  transmission[], condition[], color[] (color family), feature[], damage[], damage_area[],
  drive_status[], title[], history[] (no_accidents, one_owner, service_records, clean_history),
  year_min, year_max, price_min_cents, price_max_cents, mileage_max, seats_min,
  engine_min_l, engine_max_l, dealer. Unknown keys and bad types are ignored.
*/
create or replace function public.get_inventory_facets(p_filters jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with f as (
    select
      private.search_query(p_filters ->> 'q') as tsq,
      private.jsonb_text_array(p_filters -> 'make') as makes,
      private.jsonb_text_array(p_filters -> 'model') as models,
      private.jsonb_text_array(p_filters -> 'body') as bodies,
      private.jsonb_text_array(p_filters -> 'fuel') as fuels,
      private.jsonb_text_array(p_filters -> 'drivetrain') as drivetrains,
      private.jsonb_text_array(p_filters -> 'transmission') as transmissions,
      private.jsonb_text_array(p_filters -> 'condition') as conditions,
      private.jsonb_text_array(p_filters -> 'color') as colors,
      private.jsonb_text_array(p_filters -> 'feature') as features,
      private.jsonb_text_array(p_filters -> 'damage') as damages,
      private.jsonb_text_array(p_filters -> 'damage_area') as damage_areas,
      private.jsonb_text_array(p_filters -> 'drive_status') as drive_statuses,
      private.jsonb_text_array(p_filters -> 'title') as titles,
      private.jsonb_text_array(p_filters -> 'history') as history,
      private.jsonb_int(p_filters -> 'year_min') as year_min,
      private.jsonb_int(p_filters -> 'year_max') as year_max,
      private.jsonb_int(p_filters -> 'price_min_cents') as price_min,
      private.jsonb_int(p_filters -> 'price_max_cents') as price_max,
      private.jsonb_int(p_filters -> 'mileage_max') as mileage_max,
      private.jsonb_int(p_filters -> 'seats_min') as seats_min,
      private.jsonb_numeric(p_filters -> 'engine_min_l') as engine_min,
      private.jsonb_numeric(p_filters -> 'engine_max_l') as engine_max,
      nullif(trim(p_filters ->> 'dealer'), '') as dealer
  ),
  live as (
    select c.*
    from public.vehicle_cards c, f
    where c.status in ('active', 'reserved')
      and c.dealer_status = 'approved'
      and (f.tsq is null or c.search_vector @@ f.tsq)
  ),
  flags as (
    select
      c.*,
      (c.accident_free is true) as h_no_accidents,
      (c.owners_count = 1) as h_one_owner,
      (c.service_records is true) as h_service_records,
      (c.title_status = 'clean' and c.accident_free is true) as h_clean_history
    from live c
  ),
  ok as (
    select
      c.*,
      (f.makes is null or c.make_slug = any (f.makes)) as ok_make,
      (f.models is null or c.model_slug = any (f.models)) as ok_model,
      (f.bodies is null or c.body_type::text = any (f.bodies)) as ok_body,
      (f.fuels is null or c.fuel_type::text = any (f.fuels)) as ok_fuel,
      (f.drivetrains is null or c.drivetrain::text = any (f.drivetrains)) as ok_drivetrain,
      (f.transmissions is null or c.transmission::text = any (f.transmissions)) as ok_transmission,
      (f.conditions is null or c.condition::text = any (f.conditions)) as ok_condition,
      (f.colors is null or c.exterior_color_family::text = any (f.colors)) as ok_color,
      (f.features is null or c.feature_slugs @> f.features) as ok_feature,
      (f.damages is null or c.damage::text = any (f.damages)) as ok_damage,
      (f.damage_areas is null or c.damage_area::text = any (f.damage_areas)) as ok_damage_area,
      (f.drive_statuses is null or c.drive_status::text = any (f.drive_statuses)) as ok_drive_status,
      (f.titles is null or c.title_status::text = any (f.titles)) as ok_title,
      (f.history is null or (
        (not 'no_accidents' = any (f.history) or c.h_no_accidents)
        and (not 'one_owner' = any (f.history) or c.h_one_owner)
        and (not 'service_records' = any (f.history) or c.h_service_records)
        and (not 'clean_history' = any (f.history) or c.h_clean_history)
      )) as ok_history,
      (f.year_min is null or c.year >= f.year_min)
        and (f.year_max is null or c.year <= f.year_max)
        and (f.price_min is null or c.price_cents >= f.price_min)
        and (f.price_max is null or c.price_cents <= f.price_max)
        and (f.mileage_max is null or c.mileage <= f.mileage_max)
        and (f.seats_min is null or c.seats >= f.seats_min)
        and (f.engine_min is null or c.displacement_l >= f.engine_min)
        and (f.engine_max is null or c.displacement_l <= f.engine_max)
        and (f.dealer is null or c.dealer_slug = f.dealer) as ok_rest
    from flags c, f
  ),
  -- `fails` = how many filter groups a row misses. A row counts toward facet X when it
  -- passes everything (fails = 0) or misses only X (fails = 1 and not ok_X).
  m as (
    select
      ok.*,
      (not ok_make)::int + (not ok_model)::int + (not ok_body)::int + (not ok_fuel)::int
        + (not ok_drivetrain)::int + (not ok_transmission)::int + (not ok_condition)::int
        + (not ok_color)::int + (not ok_feature)::int + (not ok_damage)::int
        + (not ok_damage_area)::int + (not ok_drive_status)::int + (not ok_title)::int
        + (not ok_history)::int + (not ok_rest)::int as fails
    from ok
  ),
  make_counts as (
    select make_slug, count(*) as n from m
    where fails = 0 or (fails = 1 and not ok_make) group by 1
  ),
  model_counts as (
    select make_slug, model_slug, count(*) as n from m
    where fails = 0 or (fails = 1 and not ok_model) group by 1, 2
  ),
  models as (
    select md.slug::text as value, md.name as label, mk.slug::text as make, coalesce(mc.n, 0) as n
    from public.models md
    join public.makes mk on mk.id = md.make_id
    left join model_counts mc on mc.make_slug = mk.slug and mc.model_slug = md.slug
    cross join f
    where (f.makes is not null and mk.slug = any (f.makes)) or mc.n > 0
  ),
  feature_counts as (
    select fs.slug, count(*) as n
    from m cross join lateral unnest(m.feature_slugs) as fs (slug)
    where fails = 0 or (fails = 1 and not ok_feature)
    group by 1
  ),
  history_rows as (
    select * from m where fails = 0 or (fails = 1 and not ok_history)
  )
  select jsonb_build_object(
    'total', (select count(*) from m where fails = 0),
    'make', (
      select coalesce(jsonb_agg(jsonb_build_object('value', mk.slug, 'label', mk.name, 'count', coalesce(c.n, 0)) order by mk.name), '[]'::jsonb)
      from public.makes mk left join make_counts c on c.make_slug = mk.slug
    ),
    'model', (
      select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', label, 'make', make, 'count', n) order by label), '[]'::jsonb)
      from models
    ),
    'body', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.body_type = e.v and (fails = 0 or (fails = 1 and not ok_body)))) order by e.v)
      from unnest(enum_range(null::public.body_type)) as e (v)
    ),
    'fuel', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.fuel_type = e.v and (fails = 0 or (fails = 1 and not ok_fuel)))) order by e.v)
      from unnest(enum_range(null::public.fuel_type)) as e (v)
    ),
    'drivetrain', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.drivetrain = e.v and (fails = 0 or (fails = 1 and not ok_drivetrain)))) order by e.v)
      from unnest(enum_range(null::public.drivetrain)) as e (v)
    ),
    'transmission', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.transmission = e.v and (fails = 0 or (fails = 1 and not ok_transmission)))) order by e.v)
      from unnest(enum_range(null::public.transmission)) as e (v)
    ),
    'condition', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.condition = e.v and (fails = 0 or (fails = 1 and not ok_condition)))) order by e.v)
      from unnest(enum_range(null::public.vehicle_condition)) as e (v)
    ),
    'color', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.exterior_color_family = e.v and (fails = 0 or (fails = 1 and not ok_color)))) order by e.v)
      from unnest(enum_range(null::public.color_family)) as e (v)
    ),
    'damage', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.damage = e.v and (fails = 0 or (fails = 1 and not ok_damage)))) order by e.v)
      from unnest(enum_range(null::public.damage_level)) as e (v)
    ),
    'damage_area', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.damage_area = e.v and (fails = 0 or (fails = 1 and not ok_damage_area)))) order by e.v)
      from unnest(enum_range(null::public.damage_area)) as e (v)
    ),
    'drive_status', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.drive_status = e.v and (fails = 0 or (fails = 1 and not ok_drive_status)))) order by e.v)
      from unnest(enum_range(null::public.drive_status)) as e (v)
    ),
    'title', (
      select jsonb_agg(jsonb_build_object('value', e.v, 'count',
        (select count(*) from m where m.title_status = e.v and (fails = 0 or (fails = 1 and not ok_title)))) order by e.v)
      from unnest(enum_range(null::public.title_status)) as e (v)
    ),
    'history', jsonb_build_array(
      jsonb_build_object('value', 'no_accidents', 'count', (select count(*) from history_rows where h_no_accidents)),
      jsonb_build_object('value', 'one_owner', 'count', (select count(*) from history_rows where h_one_owner)),
      jsonb_build_object('value', 'service_records', 'count', (select count(*) from history_rows where h_service_records)),
      jsonb_build_object('value', 'clean_history', 'count', (select count(*) from history_rows where h_clean_history))
    ),
    'feature', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'value', ft.slug, 'label', ft.name, 'category', ft.category, 'count', coalesce(c.n, 0)
      ) order by ft.name), '[]'::jsonb)
      from public.features ft left join feature_counts c on c.slug = ft.slug
    ),
    'price', (select jsonb_build_object('min', min(price_cents), 'max', max(price_cents)) from live),
    'year', (select jsonb_build_object('min', min(year), 'max', max(year)) from live),
    'mileage', (select jsonb_build_object('min', min(mileage), 'max', max(mileage)) from live),
    'engine', (select jsonb_build_object('min', min(displacement_l), 'max', max(displacement_l)) from live)
  );
$$;

grant execute on function public.get_inventory_facets(jsonb) to anon, authenticated;
