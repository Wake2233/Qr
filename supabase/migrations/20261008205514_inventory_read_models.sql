-- Read models for the storefront: the `vehicle_cards` view (grids, compare, favorites) and
-- the `get_inventory_facets` RPC (live filter counts). Both run as the caller, so RLS on the
-- underlying tables decides what each user can see.

------------------------------------------------------------------------------
-- vehicle_cards
------------------------------------------------------------------------------

create view public.vehicle_cards
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
  end as price_dropped_at
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

comment on view public.vehicle_cards is
  'Card-sized vehicle rows (make/model names, cover photo, dealer, price drop). security_invoker: RLS applies.';

-- Read-only for everyone (joins make it non-updatable anyway; be explicit).
revoke all on public.vehicle_cards from anon, authenticated;
grant select on public.vehicle_cards to anon, authenticated;

------------------------------------------------------------------------------
-- get_inventory_facets
------------------------------------------------------------------------------

-- jsonb array of strings -> text[] (null for missing, non-array or empty input).
create function private.jsonb_text_array(p_value jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_value) = 'array' and jsonb_array_length(p_value) > 0
    then array(select jsonb_array_elements_text(p_value))
  end;
$$;

-- jsonb number -> integer (null for missing or non-numeric input).
create function private.jsonb_int(p_value jsonb)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(p_value) = 'number' then floor((p_value #>> '{}')::numeric)::bigint end;
$$;

revoke all on function private.jsonb_text_array(jsonb), private.jsonb_int(jsonb) from public;
grant execute on function private.jsonb_text_array(jsonb), private.jsonb_int(jsonb)
  to anon, authenticated, service_role;

/*
  Facet counts for the storefront filter rail. Each facet's counts apply every filter
  except its own, so selecting "BMW" still shows how many Audis match the other filters.
  Range bounds (price/year/mileage) cover all live listings matching the text search.

  p_filters keys (all optional): q, make[], model[], body[], fuel[], drivetrain[],
  transmission[], condition[], color[], feature[], year_min, year_max, price_min_cents,
  price_max_cents, mileage_max, seats_min, dealer. Unknown keys and bad types are ignored.
*/
create function public.get_inventory_facets(p_filters jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with f as (
    select
      nullif(trim(p_filters ->> 'q'), '') as q,
      private.jsonb_text_array(p_filters -> 'make') as makes,
      private.jsonb_text_array(p_filters -> 'model') as models,
      private.jsonb_text_array(p_filters -> 'body') as bodies,
      private.jsonb_text_array(p_filters -> 'fuel') as fuels,
      private.jsonb_text_array(p_filters -> 'drivetrain') as drivetrains,
      private.jsonb_text_array(p_filters -> 'transmission') as transmissions,
      private.jsonb_text_array(p_filters -> 'condition') as conditions,
      private.jsonb_text_array(p_filters -> 'color') as colors,
      private.jsonb_text_array(p_filters -> 'feature') as features,
      private.jsonb_int(p_filters -> 'year_min') as year_min,
      private.jsonb_int(p_filters -> 'year_max') as year_max,
      private.jsonb_int(p_filters -> 'price_min_cents') as price_min,
      private.jsonb_int(p_filters -> 'price_max_cents') as price_max,
      private.jsonb_int(p_filters -> 'mileage_max') as mileage_max,
      private.jsonb_int(p_filters -> 'seats_min') as seats_min,
      nullif(trim(p_filters ->> 'dealer'), '') as dealer
  ),
  live as (
    select c.*
    from public.vehicle_cards c, f
    where c.status in ('active', 'reserved')
      and c.dealer_status = 'approved'
      and (f.q is null or c.search_vector @@ websearch_to_tsquery('simple', f.q))
  ),
  m as (
    select
      c.*,
      (f.makes is null or c.make_slug = any (f.makes)) as ok_make,
      (f.models is null or c.model_slug = any (f.models)) as ok_model,
      (f.bodies is null or c.body_type::text = any (f.bodies)) as ok_body,
      (f.fuels is null or c.fuel_type::text = any (f.fuels)) as ok_fuel,
      (f.drivetrains is null or c.drivetrain::text = any (f.drivetrains)) as ok_drivetrain,
      (f.transmissions is null or c.transmission::text = any (f.transmissions)) as ok_transmission,
      (f.conditions is null or c.condition::text = any (f.conditions)) as ok_condition,
      (f.colors is null or c.exterior_color = any (f.colors)) as ok_color,
      (f.features is null or c.feature_slugs @> f.features) as ok_feature,
      (f.year_min is null or c.year >= f.year_min)
        and (f.year_max is null or c.year <= f.year_max)
        and (f.price_min is null or c.price_cents >= f.price_min)
        and (f.price_max is null or c.price_cents <= f.price_max)
        and (f.mileage_max is null or c.mileage <= f.mileage_max)
        and (f.seats_min is null or c.seats >= f.seats_min)
        and (f.dealer is null or c.dealer_slug = f.dealer) as ok_rest
    from live c, f
  ),
  makes as (
    select make_slug as value, make_name as label, count(*) as n
    from m
    where ok_rest and ok_model and ok_body and ok_fuel and ok_drivetrain and ok_transmission
      and ok_condition and ok_color and ok_feature
    group by 1, 2
  ),
  models as (
    select model_slug as value, model_name as label, make_slug, count(*) as n
    from m
    where ok_rest and ok_make and ok_body and ok_fuel and ok_drivetrain and ok_transmission
      and ok_condition and ok_color and ok_feature
    group by 1, 2, 3
  ),
  bodies as (
    select body_type::text as value, count(*) as n
    from m
    where body_type is not null and ok_rest and ok_make and ok_model and ok_fuel and ok_drivetrain
      and ok_transmission and ok_condition and ok_color and ok_feature
    group by 1
  ),
  fuels as (
    select fuel_type::text as value, count(*) as n
    from m
    where fuel_type is not null and ok_rest and ok_make and ok_model and ok_body and ok_drivetrain
      and ok_transmission and ok_condition and ok_color and ok_feature
    group by 1
  ),
  drivetrains as (
    select drivetrain::text as value, count(*) as n
    from m
    where drivetrain is not null and ok_rest and ok_make and ok_model and ok_body and ok_fuel
      and ok_transmission and ok_condition and ok_color and ok_feature
    group by 1
  ),
  transmissions as (
    select transmission::text as value, count(*) as n
    from m
    where transmission is not null and ok_rest and ok_make and ok_model and ok_body and ok_fuel
      and ok_drivetrain and ok_condition and ok_color and ok_feature
    group by 1
  ),
  conditions as (
    select condition::text as value, count(*) as n
    from m
    where ok_rest and ok_make and ok_model and ok_body and ok_fuel and ok_drivetrain
      and ok_transmission and ok_color and ok_feature
    group by 1
  ),
  colors as (
    select exterior_color as value, count(*) as n
    from m
    where exterior_color is not null and ok_rest and ok_make and ok_model and ok_body and ok_fuel
      and ok_drivetrain and ok_transmission and ok_condition and ok_feature
    group by 1
  ),
  feats as (
    select fs.slug as value, ft.name as label, count(*) as n
    from m
    cross join lateral unnest(m.feature_slugs) as fs (slug)
    join public.features ft on ft.slug = fs.slug
    where ok_rest and ok_make and ok_model and ok_body and ok_fuel and ok_drivetrain
      and ok_transmission and ok_condition and ok_color
    group by 1, 2
  )
  select jsonb_build_object(
    'total', (
      select count(*) from m
      where ok_rest and ok_make and ok_model and ok_body and ok_fuel and ok_drivetrain
        and ok_transmission and ok_condition and ok_color and ok_feature
    ),
    'make', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'label', label, 'count', n) order by label) from makes), '[]'::jsonb),
    'model', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'label', label, 'make', make_slug, 'count', n) order by label) from models), '[]'::jsonb),
    'body', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value) from bodies), '[]'::jsonb),
    'fuel', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value) from fuels), '[]'::jsonb),
    'drivetrain', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value) from drivetrains), '[]'::jsonb),
    'transmission', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value) from transmissions), '[]'::jsonb),
    'condition', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value) from conditions), '[]'::jsonb),
    'color', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value) from colors), '[]'::jsonb),
    'feature', coalesce((select jsonb_agg(jsonb_build_object('value', value, 'label', label, 'count', n) order by label) from feats), '[]'::jsonb),
    'price', (select jsonb_build_object('min', min(price_cents), 'max', max(price_cents)) from live),
    'year', (select jsonb_build_object('min', min(year), 'max', max(year)) from live),
    'mileage', (select jsonb_build_object('min', min(mileage), 'max', max(mileage)) from live)
  );
$$;

grant execute on function public.get_inventory_facets(jsonb) to anon, authenticated;
