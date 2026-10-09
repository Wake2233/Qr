-- Phase 5: prefix ("search as you type") text search for the storefront.
-- `private.search_query` turns free text into `word:* & word:*`, so "cam" matches "Camry".
-- @cp/core `buildSearchQuery` builds the identical string for PostgREST (`fts(simple)`),
-- so the grid and the facet counts always agree.

create function private.search_query(p_text text)
returns tsquery
language sql
immutable
set search_path = ''
as $$
  select case when count(*) > 0
    then to_tsquery('simple', string_agg(w || ':*', ' & ' order by n))
  end
  from (
    select w, n
    from unnest(regexp_split_to_array(lower(coalesce(p_text, '')), '[^[:alnum:]]+'))
      with ordinality as t (w, n)
    where w <> ''
    order by n
    limit 8
  ) words;
$$;

revoke all on function private.search_query(text) from public;
grant execute on function private.search_query(text) to anon, authenticated, service_role;

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
      and (f.tsq is null or c.search_vector @@ f.tsq)
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

------------------------------------------------------------------------------
-- Search vector: punctuation-insensitive, with compact model/trim tokens.
-- The default parser reads "F-150" as 'f' + '-150' (a negative number), so neither
-- "150" nor "f150" matched. Words are now split on punctuation, and model/trim are also
-- indexed without separators: "F-150", "F 150", "f150" and "f15" all find the truck.
------------------------------------------------------------------------------

create function private.search_words(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(coalesce(p_text, '')), '[^[:alnum:]]+', ' ', 'g');
$$;

create function private.vehicle_search_vector(
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
      p_year, private.search_words(p_make), private.search_words(p_model),
      replace(private.search_words(p_model), ' ', ''))), 'A')
    || setweight(to_tsvector('simple', concat_ws(' ',
      private.search_words(p_trim), replace(private.search_words(p_trim), ' ', ''))), 'B')
    || setweight(to_tsvector('simple', private.search_words(concat_ws(' ', p_color, p_body, p_fuel))), 'C')
    || setweight(to_tsvector('english', coalesce(p_description, '')), 'D');
$$;

revoke all on function private.search_words(text) from public;
revoke all on function private.vehicle_search_vector(int, text, text, text, text, text, text, text) from public;

create or replace function private.vehicles_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_make text;
  v_model text;
  v_dealer public.dealers%rowtype;
  v_review boolean;
  v_entering_live boolean;
  v_missing text[];
begin
  select name into v_make from public.makes where id = new.make_id;
  select name into v_model from public.models where id = new.model_id and make_id = new.make_id;
  if v_model is null then
    raise exception 'INVALID_MODEL: model % does not belong to make %', new.model_id, new.make_id
      using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    new.slug := left(
      trim(both '-' from regexp_replace(
        lower(concat_ws(' ', new.year, v_make, v_model, new.trim)), '[^a-z0-9]+', '-', 'g'
      )), 100
    ) || '-' || left(replace(new.id::text, '-', ''), 8);
    new.published_at := null;
    new.sold_at := null;
  end if;

  new.search_vector := private.vehicle_search_vector(
    new.year, v_make, v_model, new.trim, new.exterior_color,
    new.body_type::text, new.fuel_type::text, new.description
  );

  -- Publish gate: entering a buyer-visible state from draft/pending/archived.
  v_entering_live := new.status in ('active', 'reserved', 'sold')
    and (tg_op = 'INSERT' or old.status not in ('active', 'reserved', 'sold'));

  if v_entering_live then
    select * into v_dealer from public.dealers where id = new.dealer_id;
    if v_dealer.status <> 'approved' then
      raise exception 'DEALER_NOT_APPROVED: dealer must be approved before publishing'
        using errcode = 'P0001';
    end if;

    v_missing := array_remove(array[
      case when new.price_cents is null then 'price_cents' end,
      case when new.mileage is null then 'mileage' end,
      case when new.body_type is null then 'body_type' end,
      case when new.fuel_type is null then 'fuel_type' end,
      case when new.drivetrain is null then 'drivetrain' end,
      case when new.transmission is null then 'transmission' end,
      case when new.exterior_color is null then 'exterior_color' end
    ], null);
    if cardinality(v_missing) > 0 then
      raise exception 'MISSING_FIELDS: %', array_to_string(v_missing, ',')
        using errcode = 'P0001';
    end if;

    if new.year > extract(year from now())::int + 1 then
      raise exception 'INVALID_YEAR: year cannot be later than next model year'
        using errcode = 'P0001';
    end if;

    if tg_op = 'INSERT'
      or not exists (select 1 from public.vehicle_images where vehicle_id = new.id) then
      raise exception 'MISSING_IMAGES: at least one photo is required to publish'
        using errcode = 'P0001';
    end if;

    -- Listing review: non-house dealers wait for an admin (who can publish straight from pending_review).
    select require_listing_review into v_review from public.site_settings where id = 1;
    if coalesce(v_review, false) and not v_dealer.is_house and not private.is_admin() then
      new.status := 'pending_review';
    end if;
  end if;

  if new.status in ('active', 'reserved', 'sold') then
    new.published_at := coalesce(new.published_at, now());
  end if;

  if new.status = 'sold' and (tg_op = 'INSERT' or old.status <> 'sold') then
    new.sold_at := now();
  elsif new.status <> 'sold' then
    new.sold_at := null;
  end if;

  return new;
end;
$$;

-- Rebuild existing vectors. The write triggers fire too (same vector, updated_at bumps);
-- price and status are unchanged, so no price history or audit rows are written.
update public.vehicles v
set search_vector = private.vehicle_search_vector(
  v.year, mk.name, md.name, v.trim, v.exterior_color,
  v.body_type::text, v.fuel_type::text, v.description
)
from public.makes mk, public.models md
where mk.id = v.make_id and md.id = v.model_id;
