-- Business-rule triggers and RPCs shared by web and mobile.
-- Errors raised for clients use SQLSTATE P0001 with a stable "CODE: message" prefix.

------------------------------------------------------------------------------
-- vehicles: slug, search vector, publish gate, lifecycle timestamps
------------------------------------------------------------------------------

create function private.vehicles_before_write()
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

  new.search_vector :=
    setweight(to_tsvector('simple', concat_ws(' ', new.year, v_make, v_model)), 'A')
    || setweight(to_tsvector('simple', coalesce(new.trim, '')), 'B')
    || setweight(to_tsvector('simple', concat_ws(' ', new.exterior_color, new.body_type, new.fuel_type)), 'C')
    || setweight(to_tsvector('english', coalesce(new.description, '')), 'D');

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

create trigger vehicles_before_write
  before insert or update on public.vehicles
  for each row execute function private.vehicles_before_write();

-- Price history + audit trail for price/status changes.
create function private.vehicles_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.price_cents is distinct from old.price_cents then
    insert into public.vehicle_price_history (vehicle_id, old_price_cents, new_price_cents, changed_by)
    values (new.id, old.price_cents, new.price_cents, auth.uid());
  end if;

  if new.price_cents is distinct from old.price_cents or new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, entity, entity_id, diff)
    values (
      auth.uid(),
      'vehicle.update',
      'vehicles',
      new.id::text,
      jsonb_strip_nulls(jsonb_build_object(
        'price_cents', case when new.price_cents is distinct from old.price_cents
          then jsonb_build_array(old.price_cents, new.price_cents) end,
        'status', case when new.status is distinct from old.status
          then jsonb_build_array(old.status, new.status) end
      ))
    );
  end if;
  return null;
end;
$$;

create trigger vehicles_after_update
  after update on public.vehicles
  for each row execute function private.vehicles_after_update();

------------------------------------------------------------------------------
-- audit triggers for dealers.status and profiles.role
------------------------------------------------------------------------------

create function private.audit_dealer_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log (actor_id, action, entity, entity_id, diff)
    values (auth.uid(), 'dealer.status', 'dealers', new.id::text,
            jsonb_build_object('status', jsonb_build_array(old.status, new.status)));
  end if;
  return null;
end;
$$;

create trigger dealers_audit_status
  after update of status on public.dealers
  for each row execute function private.audit_dealer_status();

create function private.audit_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, entity, entity_id, diff)
    values (auth.uid(), 'profile.role', 'profiles', new.id::text,
            jsonb_build_object('role', jsonb_build_array(old.role, new.role)));
  end if;
  return null;
end;
$$;

create trigger profiles_audit_role
  after update of role on public.profiles
  for each row execute function private.audit_profile_role();

------------------------------------------------------------------------------
-- dealer_members: a dealer must always keep at least one owner
------------------------------------------------------------------------------

create function private.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner'
    and (tg_op = 'DELETE' or new.role <> 'owner')
    and exists (select 1 from public.dealers where id = old.dealer_id)  -- skip cascades from dealer delete
    and not exists (
      select 1 from public.dealer_members
      where dealer_id = old.dealer_id and role = 'owner' and user_id <> old.user_id
    ) then
    raise exception 'LAST_OWNER: a dealer must keep at least one owner' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger dealer_members_guard_last_owner
  before update of role or delete on public.dealer_members
  for each row execute function private.guard_last_owner();

------------------------------------------------------------------------------
-- RPC: apply_as_dealer
------------------------------------------------------------------------------

create function public.apply_as_dealer(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(payload ->> 'display_name');
  v_slug text;
  v_dealer_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED: sign in to apply' using errcode = 'P0001';
  end if;
  if v_name is null or char_length(v_name) < 2 then
    raise exception 'MISSING_FIELDS: display_name' using errcode = 'P0001';
  end if;
  if coalesce(payload ->> 'phone_e164', '') = '' or coalesce(payload ->> 'whatsapp_e164', '') = '' then
    raise exception 'MISSING_FIELDS: phone_e164,whatsapp_e164' using errcode = 'P0001';
  end if;
  if (select count(*) from public.dealer_members dm
      join public.dealers d on d.id = dm.dealer_id
      where dm.user_id = v_uid and dm.role = 'owner' and d.status = 'pending') >= 1 then
    raise exception 'APPLICATION_PENDING: you already have a pending dealer application'
      using errcode = 'P0001';
  end if;

  v_slug := left(trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')), 100)
    || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.dealers (
    slug, display_name, legal_name, status, phone_e164, whatsapp_e164, email, website,
    address_line1, city, state, postal_code, description, created_by
  ) values (
    v_slug, v_name, payload ->> 'legal_name', 'pending',
    payload ->> 'phone_e164', payload ->> 'whatsapp_e164', payload ->> 'email', payload ->> 'website',
    payload ->> 'address_line1', payload ->> 'city', payload ->> 'state', payload ->> 'postal_code',
    payload ->> 'description', v_uid
  )
  returning id into v_dealer_id;

  insert into public.dealer_private (dealer_id, license_number)
  values (v_dealer_id, payload ->> 'license_number');

  insert into public.dealer_members (dealer_id, user_id, role)
  values (v_dealer_id, v_uid, 'owner');

  return v_dealer_id;
end;
$$;

------------------------------------------------------------------------------
-- RPCs: admin dealer moderation
------------------------------------------------------------------------------

create function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'FORBIDDEN: admin only' using errcode = 'P0001';
  end if;
end;
$$;

create function public.approve_dealer(p_dealer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.dealers
    set status = 'approved', approved_at = now(), approved_by = auth.uid(), rejection_reason = null
    where id = p_dealer_id;
  if not found then
    raise exception 'NOT_FOUND: dealer %', p_dealer_id using errcode = 'P0001';
  end if;
  update public.profiles p set role = 'dealer'
    from public.dealer_members dm
    where dm.dealer_id = p_dealer_id and dm.user_id = p.id and p.role = 'buyer';
end;
$$;

create function public.reject_dealer(p_dealer_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.dealers
    set status = 'rejected', rejection_reason = left(p_reason, 1000), approved_at = null, approved_by = null
    where id = p_dealer_id and not is_house;
  if not found then
    raise exception 'NOT_FOUND: dealer %', p_dealer_id using errcode = 'P0001';
  end if;
end;
$$;

-- Suspending hides every listing immediately (public vehicle policy requires an approved dealer).
create function public.suspend_dealer(p_dealer_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.dealers
    set status = 'suspended', rejection_reason = left(p_reason, 1000)
    where id = p_dealer_id and not is_house;
  if not found then
    raise exception 'NOT_FOUND: dealer %', p_dealer_id using errcode = 'P0001';
  end if;
end;
$$;

create function public.set_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_role <> 'admin'
    and exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
    and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'LAST_ADMIN: cannot demote the last admin' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'NOT_FOUND: user %', p_user_id using errcode = 'P0001';
  end if;
end;
$$;

------------------------------------------------------------------------------
-- RPCs: inventory helpers (security invoker, so RLS still applies)
------------------------------------------------------------------------------

create function public.set_vehicle_status(p_vehicle_id uuid, p_status public.listing_status)
returns public.listing_status
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.listing_status;
begin
  update public.vehicles set status = p_status where id = p_vehicle_id
    returning status into v_status;
  if not found then
    raise exception 'NOT_FOUND: vehicle %', p_vehicle_id using errcode = 'P0001';
  end if;
  return v_status;
end;
$$;

create function public.reorder_vehicle_images(p_vehicle_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.vehicle_images where vehicle_id = p_vehicle_id;
  if v_count <> cardinality(p_ordered_ids)
    or v_count <> (select count(*) from public.vehicle_images
                   where vehicle_id = p_vehicle_id and id = any (p_ordered_ids)) then
    raise exception 'INVALID_ORDER: ids must match the vehicle''s images exactly' using errcode = 'P0001';
  end if;

  set constraints public.vehicle_images_position_key deferred;
  update public.vehicle_images vi
    set position = o.ord - 1
    from unnest(p_ordered_ids) with ordinality as o (id, ord)
    where vi.id = o.id and vi.vehicle_id = p_vehicle_id;
end;
$$;

------------------------------------------------------------------------------
-- RPCs: anonymous analytics (fire-and-forget from clients)
------------------------------------------------------------------------------

create function public.track_contact_click(
  p_vehicle_id uuid,
  p_channel public.contact_channel,
  p_platform public.client_platform
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dealer_id uuid;
begin
  select v.dealer_id into v_dealer_id
  from public.vehicles v
  join public.dealers d on d.id = v.dealer_id and d.status = 'approved'
  where v.id = p_vehicle_id and v.status in ('active', 'reserved', 'sold');

  if v_dealer_id is not null then
    insert into public.contact_clicks (vehicle_id, dealer_id, channel, platform, user_id)
    values (p_vehicle_id, v_dealer_id, p_channel, p_platform, auth.uid());
  end if;
end;
$$;

create function public.record_vehicle_view(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.vehicles v
    join public.dealers d on d.id = v.dealer_id and d.status = 'approved'
    where v.id = p_vehicle_id and v.status in ('active', 'reserved', 'sold')
  ) then
    insert into public.vehicle_views (vehicle_id, day, views)
    values (p_vehicle_id, current_date, 1)
    on conflict (vehicle_id, day) do update set views = public.vehicle_views.views + 1;
  end if;
end;
$$;

------------------------------------------------------------------------------
-- Function privileges: nothing is executable unless granted here.
------------------------------------------------------------------------------

revoke all on all functions in schema private from public;
grant execute on function
  private.is_admin(),
  private.user_dealer_ids(),
  private.user_managed_dealer_ids(),
  private.dealer_role(uuid),
  private.is_dealer_user()
to anon, authenticated, service_role;

revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

grant execute on function public.apply_as_dealer(jsonb) to authenticated;
grant execute on function public.approve_dealer(uuid) to authenticated;
grant execute on function public.reject_dealer(uuid, text) to authenticated;
grant execute on function public.suspend_dealer(uuid, text) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.set_vehicle_status(uuid, public.listing_status) to authenticated;
grant execute on function public.reorder_vehicle_images(uuid, uuid[]) to authenticated;
grant execute on function public.track_contact_click(uuid, public.contact_channel, public.client_platform)
  to anon, authenticated;
grant execute on function public.record_vehicle_view(uuid) to anon, authenticated;
