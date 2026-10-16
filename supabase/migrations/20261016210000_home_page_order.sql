-- Home page order: admins pin listings (is_featured) and drag them into order (home_position).
-- The home page shows pinned listings by position (#1 is the spotlight), then everything
-- else newest first. Positions are written only by the trigger and by set_home_order.

alter table public.vehicles add column home_position smallint check (home_position > 0);
comment on column public.vehicles.home_position is
  'Home page order of a pinned (is_featured) listing, 1 = spotlight. Null when not pinned.';
create index vehicles_home_position_idx on public.vehicles (home_position) where is_featured;

-- Pinning appends to the end of the order; unpinning clears the position.
-- (Only admins can change is_featured: vehicles_guard_admin_columns.)
create function private.vehicles_home_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_featured then
    new.home_position := null;
  elsif new.home_position is null then
    select coalesce(max(home_position), 0) + 1 into new.home_position
    from public.vehicles where is_featured and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger vehicles_home_position
  before insert or update of is_featured, home_position on public.vehicles
  for each row execute function private.vehicles_home_position();

-- Existing pins keep their current home order (newest first).
update public.vehicles v
set home_position = o.n
from (
  select id, row_number() over (order by published_at desc nulls last, created_at desc) as n
  from public.vehicles where is_featured
) o
where v.id = o.id;

/*
  Admin: the full pinned list in display order. Listed ids are pinned at positions 1..n;
  every other pinned listing is unpinned. Unknown ids are ignored.
*/
create function public.set_home_order(p_vehicle_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN: only admins can arrange the home page' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_vehicle_ids), 0) > 100 then
    raise exception 'TOO_MANY: pin at most 100 listings' using errcode = 'P0001';
  end if;

  update public.vehicles set is_featured = false
  where is_featured and not (id = any (coalesce(p_vehicle_ids, '{}')));

  update public.vehicles v
  set is_featured = true, home_position = o.n
  from unnest(coalesce(p_vehicle_ids, '{}')) with ordinality as o (id, n)
  where v.id = o.id
    and (v.home_position is distinct from o.n or not v.is_featured);

  select count(*) into v_count from public.vehicles where is_featured;
  return v_count;
end;
$$;

revoke all on function public.set_home_order(uuid[]) from public, anon;
grant execute on function public.set_home_order(uuid[]) to authenticated;

------------------------------------------------------------------------------
-- vehicle_cards: append home_position
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
  v.exterior_color_family,
  v.home_position
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
