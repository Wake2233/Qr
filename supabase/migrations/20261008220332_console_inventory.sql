-- Phase 4: management console. Image/feature RPCs, team management, admin user list,
-- admin-only featuring, and console columns on vehicle_cards.
-- Errors use SQLSTATE P0001 with a stable "CODE: message" prefix (see @cp/core DB_ERROR_MESSAGES).

------------------------------------------------------------------------------
-- vehicle_cards: append console columns (vin, updated_at). Same definition otherwise.
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
  v.updated_at
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
-- vehicles: only admins can feature a listing (members may update every other column)
------------------------------------------------------------------------------

create function private.vehicles_guard_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- No JWT (seed, service role, migrations) is trusted; signed-in non-admins are not.
  if (select auth.uid()) is not null and not private.is_admin()
    and ((tg_op = 'INSERT' and new.is_featured)
      or (tg_op = 'UPDATE' and new.is_featured is distinct from old.is_featured)) then
    raise exception 'FORBIDDEN: only admins can feature listings' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger vehicles_guard_admin_columns
  before insert or update on public.vehicles
  for each row execute function private.vehicles_guard_admin_columns();

------------------------------------------------------------------------------
-- vehicle_images: a live listing must keep at least one photo
------------------------------------------------------------------------------

create function private.guard_last_vehicle_image()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
      select 1 from public.vehicles
      where id = old.vehicle_id and status in ('active', 'reserved', 'pending_review')
    )  -- a missing parent means a cascade from vehicle delete
    and not exists (
      select 1 from public.vehicle_images where vehicle_id = old.vehicle_id and id <> old.id
    ) then
    raise exception 'MISSING_IMAGES: a published listing needs at least one photo; unpublish it first'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

create trigger vehicle_images_guard_last
  before delete on public.vehicle_images
  for each row execute function private.guard_last_vehicle_image();

------------------------------------------------------------------------------
-- RPC: add_vehicle_images (appends photos after the current last position)
------------------------------------------------------------------------------

-- p_images: [{ "storage_path": "...", "width": 1600, "height": 1200, "blurhash": "...", "alt": "..." }]
-- security invoker: the vehicle_images insert policy still decides who may add photos.
create function public.add_vehicle_images(p_vehicle_id uuid, p_images jsonb)
returns setof public.vehicle_images
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_dealer_id uuid;
  v_next integer;
  v_prefix text;
  v_image jsonb;
begin
  select dealer_id into v_dealer_id from public.vehicles where id = p_vehicle_id;
  if v_dealer_id is null then
    raise exception 'NOT_FOUND: vehicle %', p_vehicle_id using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_images) <> 'array' or jsonb_array_length(p_images) = 0 then
    raise exception 'MISSING_FIELDS: images' using errcode = 'P0001';
  end if;

  select coalesce(max(position) + 1, 0) into v_next
    from public.vehicle_images where vehicle_id = p_vehicle_id;
  if v_next + jsonb_array_length(p_images) > 40 then
    raise exception 'TOO_MANY_IMAGES: a listing can have at most 40 photos' using errcode = 'P0001';
  end if;

  -- Photos must live under this vehicle's folder, so a row can never point at another dealer's file.
  v_prefix := v_dealer_id::text || '/' || p_vehicle_id::text || '/';
  for v_image in select value from jsonb_array_elements(p_images) loop
    if coalesce(v_image ->> 'storage_path', '') not like v_prefix || '%'
      or (v_image ->> 'storage_path') like '%..%' then
      raise exception 'INVALID_PATH: photos must be uploaded to %', v_prefix using errcode = 'P0001';
    end if;
  end loop;

  return query
    insert into public.vehicle_images (vehicle_id, storage_path, position, width, height, blurhash, alt)
    select p_vehicle_id,
           e.value ->> 'storage_path',
           v_next + e.ordinality::int - 1,
           nullif(e.value ->> 'width', '')::int,
           nullif(e.value ->> 'height', '')::int,
           nullif(e.value ->> 'blurhash', ''),
           nullif(e.value ->> 'alt', '')
    from jsonb_array_elements(p_images) with ordinality as e
    returning *;
end;
$$;

------------------------------------------------------------------------------
-- RPC: set_vehicle_features (replace the feature set in one call)
------------------------------------------------------------------------------

create function public.set_vehicle_features(p_vehicle_id uuid, p_feature_ids smallint[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.vehicles where id = p_vehicle_id) then
    raise exception 'NOT_FOUND: vehicle %', p_vehicle_id using errcode = 'P0001';
  end if;
  delete from public.vehicle_features
    where vehicle_id = p_vehicle_id and feature_id <> all (coalesce(p_feature_ids, '{}'));
  insert into public.vehicle_features (vehicle_id, feature_id)
    select p_vehicle_id, f from unnest(coalesce(p_feature_ids, '{}')) as f
    on conflict do nothing;
end;
$$;

------------------------------------------------------------------------------
-- RPCs: dealer team (emails live in auth.users, so these are security definer)
------------------------------------------------------------------------------

create function public.get_dealer_team(p_dealer_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role public.dealer_member_role,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.dealer_role(p_dealer_id) is null and not private.is_admin() then
    raise exception 'FORBIDDEN: not a member of this dealer' using errcode = 'P0001';
  end if;
  return query
    select dm.user_id, u.email::text, p.full_name, dm.role, dm.created_at
    from public.dealer_members dm
    join public.profiles p on p.id = dm.user_id
    join auth.users u on u.id = dm.user_id
    where dm.dealer_id = p_dealer_id
    order by case dm.role when 'owner' then 0 when 'manager' then 1 else 2 end, dm.created_at;
end;
$$;

-- Adds an existing account to a dealer. Owners add anyone; managers add managers/staff.
create function public.add_dealer_member(
  p_dealer_id uuid, p_email text, p_role public.dealer_member_role default 'staff'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller public.dealer_member_role := private.dealer_role(p_dealer_id);
  v_user_id uuid;
begin
  if not private.is_admin()
    and not (v_caller = 'owner' or (v_caller = 'manager' and p_role <> 'owner')) then
    raise exception 'FORBIDDEN: only owners and managers can add team members' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.dealers where id = p_dealer_id) then
    raise exception 'NOT_FOUND: dealer %', p_dealer_id using errcode = 'P0001';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));
  if v_user_id is null then
    raise exception 'USER_NOT_FOUND: no account uses that email; ask them to sign up first'
      using errcode = 'P0001';
  end if;
  if exists (select 1 from public.dealer_members where dealer_id = p_dealer_id and user_id = v_user_id) then
    raise exception 'ALREADY_MEMBER: that person is already on the team' using errcode = 'P0001';
  end if;

  insert into public.dealer_members (dealer_id, user_id, role) values (p_dealer_id, v_user_id, p_role);

  -- Approved dealers' members get console access straight away (approve_dealer does this for the rest).
  update public.profiles set role = 'dealer'
    where id = v_user_id and role = 'buyer'
      and exists (select 1 from public.dealers where id = p_dealer_id and status = 'approved');
  return v_user_id;
end;
$$;

------------------------------------------------------------------------------
-- RPC: admin_list_users (admin user directory with emails)
------------------------------------------------------------------------------

create function public.admin_list_users(
  p_search text default null, p_limit integer default 50, p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  role public.app_role,
  dealer_count integer,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(trim(p_search), '');
begin
  perform private.require_admin();
  return query
    select p.id, u.email::text, p.full_name, p.role,
           (select count(*)::int from public.dealer_members dm where dm.user_id = p.id),
           p.created_at,
           count(*) over ()
    from public.profiles p
    join auth.users u on u.id = p.id
    where v_search is null
      or u.email ilike '%' || v_search || '%'
      or p.full_name ilike '%' || v_search || '%'
    order by case p.role when 'admin' then 0 when 'dealer' then 1 else 2 end, p.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

------------------------------------------------------------------------------
-- Function privileges
------------------------------------------------------------------------------

revoke all on function private.vehicles_guard_admin_columns() from public;
revoke all on function private.guard_last_vehicle_image() from public;
grant execute on function public.add_vehicle_images(uuid, jsonb) to authenticated;
grant execute on function public.set_vehicle_features(uuid, smallint[]) to authenticated;
grant execute on function public.get_dealer_team(uuid) to authenticated;
grant execute on function public.add_dealer_member(uuid, text, public.dealer_member_role) to authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
