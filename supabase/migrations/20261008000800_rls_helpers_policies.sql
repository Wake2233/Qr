-- Row Level Security: helper functions, privilege hardening and policies.
-- Policy naming: "<table>: <who> can <what>". Helpers are wrapped in (select ...) to become initPlans.

------------------------------------------------------------------------------
-- Helpers (security definer so they can read membership without recursing into RLS)
------------------------------------------------------------------------------

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Dealers the current user belongs to (any role).
create function private.user_dealer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select dealer_id from public.dealer_members where user_id = (select auth.uid());
$$;

-- Dealers the current user can administer (owner or manager).
create function private.user_managed_dealer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select dealer_id from public.dealer_members
  where user_id = (select auth.uid()) and role in ('owner', 'manager');
$$;

-- The current user's role at a given dealer (null if not a member).
create function private.dealer_role(p_dealer_id uuid)
returns public.dealer_member_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.dealer_members
  where dealer_id = p_dealer_id and user_id = (select auth.uid());
$$;

-- True if the current user belongs to any dealer.
create function private.is_dealer_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.dealer_members where user_id = (select auth.uid()));
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.is_admin(),
  private.user_dealer_ids(),
  private.user_managed_dealer_ids(),
  private.dealer_role(uuid),
  private.is_dealer_user()
to anon, authenticated, service_role;

------------------------------------------------------------------------------
-- Privilege hardening
------------------------------------------------------------------------------

-- anon never writes directly; public writes go through RPCs. TRUNCATE bypasses RLS, so nobody gets it.
revoke insert, update, delete on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- Column grants: sensitive columns change only through RPCs/triggers.
revoke insert, update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

revoke insert, update on public.dealers from authenticated;
grant update (
  slug, display_name, legal_name, logo_path, phone_e164, whatsapp_e164, email, website,
  address_line1, city, state, postal_code, lat, lng, description, business_hours
) on public.dealers to authenticated;

revoke insert, update on public.dealer_private from authenticated;
grant update (license_number, tax_id_last4, documents) on public.dealer_private to authenticated;

revoke update on public.dealer_members from authenticated;
grant update (role) on public.dealer_members to authenticated;

revoke update on public.vehicles from authenticated;
grant update (
  dealer_id, stock_number, vin, make_id, model_id, year, trim, condition, body_type, mileage,
  price_cents, msrp_cents, exterior_color, interior_color, fuel_type, drivetrain, transmission,
  engine, cylinders, displacement_l, horsepower, torque_lbft, mpg_city, mpg_highway, ev_range_mi,
  doors, seats, owners_count, accident_free, title_status, description, specs, status, is_featured
) on public.vehicles to authenticated;

revoke update on public.vehicle_images from authenticated;
grant update (position, width, height, blurhash, alt) on public.vehicle_images to authenticated;

revoke insert, update, delete on public.vehicle_price_history from authenticated;
revoke insert, update, delete on public.vin_decodes from authenticated;

revoke insert, update on public.leads from authenticated;
grant update (status, assigned_to, first_response_at) on public.leads to authenticated;

revoke update, delete on public.lead_activities from authenticated;

revoke insert, update, delete on public.contact_clicks from authenticated;
revoke insert, update, delete on public.vehicle_views from authenticated;

revoke insert, update on public.finance_applications from authenticated;
grant update (status) on public.finance_applications to authenticated;
revoke insert, update, delete on public.lender_offers from authenticated;

revoke insert, delete on public.site_settings from authenticated;
revoke insert, update, delete on public.audit_log from authenticated;

------------------------------------------------------------------------------
-- profiles
------------------------------------------------------------------------------

create policy "profiles: users can read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: dealer members can read teammates"
  on public.profiles for select to authenticated
  using (id in (
    select dm.user_id from public.dealer_members dm
    where dm.dealer_id in (select private.user_dealer_ids())
  ));

create policy "profiles: admins can read all"
  on public.profiles for select to authenticated
  using ((select private.is_admin()));

create policy "profiles: users can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: admins can update all"
  on public.profiles for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

------------------------------------------------------------------------------
-- dealers / dealer_private / dealer_members
------------------------------------------------------------------------------

create policy "dealers: public can read approved dealers"
  on public.dealers for select to anon, authenticated
  using (status = 'approved');

create policy "dealers: members can read own dealer"
  on public.dealers for select to authenticated
  using (id in (select private.user_dealer_ids()));

create policy "dealers: admins can read all"
  on public.dealers for select to authenticated
  using ((select private.is_admin()));

create policy "dealers: managers can update own dealer"
  on public.dealers for update to authenticated
  using (id in (select private.user_managed_dealer_ids()))
  with check (id in (select private.user_managed_dealer_ids()));

create policy "dealers: admins can update all"
  on public.dealers for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "dealers: admins can delete"
  on public.dealers for delete to authenticated
  using ((select private.is_admin()));

create policy "dealer_private: members can read"
  on public.dealer_private for select to authenticated
  using (dealer_id in (select private.user_dealer_ids()));

create policy "dealer_private: admins can read all"
  on public.dealer_private for select to authenticated
  using ((select private.is_admin()));

create policy "dealer_private: managers can update"
  on public.dealer_private for update to authenticated
  using (dealer_id in (select private.user_managed_dealer_ids()))
  with check (dealer_id in (select private.user_managed_dealer_ids()));

create policy "dealer_private: admins can update all"
  on public.dealer_private for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "dealer_members: members can read own team"
  on public.dealer_members for select to authenticated
  using (user_id = (select auth.uid()) or dealer_id in (select private.user_dealer_ids()));

create policy "dealer_members: admins can read all"
  on public.dealer_members for select to authenticated
  using ((select private.is_admin()));

-- Owners can add anyone; managers can add managers/staff but never owners.
create policy "dealer_members: managers can add members"
  on public.dealer_members for insert to authenticated
  with check (
    private.dealer_role(dealer_id) = 'owner'
    or (private.dealer_role(dealer_id) = 'manager' and role <> 'owner')
  );

create policy "dealer_members: managers can change roles"
  on public.dealer_members for update to authenticated
  using (
    private.dealer_role(dealer_id) = 'owner'
    or (private.dealer_role(dealer_id) = 'manager' and role <> 'owner')
  )
  with check (
    private.dealer_role(dealer_id) = 'owner'
    or (private.dealer_role(dealer_id) = 'manager' and role <> 'owner')
  );

create policy "dealer_members: managers can remove members"
  on public.dealer_members for delete to authenticated
  using (
    private.dealer_role(dealer_id) = 'owner'
    or (private.dealer_role(dealer_id) = 'manager' and role <> 'owner')
  );

create policy "dealer_members: admins can manage all"
  on public.dealer_members for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

------------------------------------------------------------------------------
-- catalog (makes / models / features / lenders)
------------------------------------------------------------------------------

create policy "makes: public can read"
  on public.makes for select to anon, authenticated using (true);
create policy "makes: admins can manage"
  on public.makes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "models: public can read"
  on public.models for select to anon, authenticated using (true);
create policy "models: admins can manage"
  on public.models for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "features: public can read"
  on public.features for select to anon, authenticated using (true);
create policy "features: admins can manage"
  on public.features for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "lenders: public can read active lenders"
  on public.lenders for select to anon, authenticated using (active);
create policy "lenders: admins can manage"
  on public.lenders for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

------------------------------------------------------------------------------
-- vehicles and children
------------------------------------------------------------------------------

create policy "vehicles: public can read live listings"
  on public.vehicles for select to anon, authenticated
  using (
    (status in ('active', 'reserved') or (status = 'sold' and sold_at > now() - interval '30 days'))
    and exists (select 1 from public.dealers d where d.id = dealer_id and d.status = 'approved')
  );

create policy "vehicles: members can read own inventory"
  on public.vehicles for select to authenticated
  using (dealer_id in (select private.user_dealer_ids()));

create policy "vehicles: admins can read all"
  on public.vehicles for select to authenticated
  using ((select private.is_admin()));

create policy "vehicles: members can insert"
  on public.vehicles for insert to authenticated
  with check (
    dealer_id in (select private.user_dealer_ids())
    and created_by = (select auth.uid())
  );

create policy "vehicles: admins can insert"
  on public.vehicles for insert to authenticated
  with check ((select private.is_admin()));

create policy "vehicles: members can update"
  on public.vehicles for update to authenticated
  using (dealer_id in (select private.user_dealer_ids()))
  with check (dealer_id in (select private.user_dealer_ids()));

create policy "vehicles: admins can update all"
  on public.vehicles for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Dealers archive instead of deleting; only admins hard-delete.
create policy "vehicles: admins can delete"
  on public.vehicles for delete to authenticated
  using ((select private.is_admin()));

-- Children are readable whenever the parent vehicle is (vehicles RLS applies inside the subquery).
create policy "vehicle_images: readable with parent vehicle"
  on public.vehicle_images for select to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));

create policy "vehicle_images: members can insert"
  on public.vehicle_images for insert to authenticated
  with check (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.dealer_id in (select private.user_dealer_ids())
  ));

create policy "vehicle_images: members can update"
  on public.vehicle_images for update to authenticated
  using (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.dealer_id in (select private.user_dealer_ids())
  ))
  with check (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.dealer_id in (select private.user_dealer_ids())
  ));

create policy "vehicle_images: members can delete"
  on public.vehicle_images for delete to authenticated
  using (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.dealer_id in (select private.user_dealer_ids())
  ));

create policy "vehicle_images: admins can manage"
  on public.vehicle_images for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "vehicle_features: readable with parent vehicle"
  on public.vehicle_features for select to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));

create policy "vehicle_features: members can insert"
  on public.vehicle_features for insert to authenticated
  with check (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.dealer_id in (select private.user_dealer_ids())
  ));

create policy "vehicle_features: members can delete"
  on public.vehicle_features for delete to authenticated
  using (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.dealer_id in (select private.user_dealer_ids())
  ));

create policy "vehicle_features: admins can manage"
  on public.vehicle_features for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "vehicle_price_history: readable with parent vehicle"
  on public.vehicle_price_history for select to anon, authenticated
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));

create policy "vin_decodes: dealers can read"
  on public.vin_decodes for select to authenticated
  using ((select private.is_dealer_user()) or (select private.is_admin()));

------------------------------------------------------------------------------
-- buyer data
------------------------------------------------------------------------------

create policy "favorites: users can read own"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: users can add own"
  on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "favorites: users can remove own"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: admins can read all"
  on public.favorites for select to authenticated
  using ((select private.is_admin()));

------------------------------------------------------------------------------
-- CRM
------------------------------------------------------------------------------

create policy "leads: users can read own"
  on public.leads for select to authenticated
  using (user_id = (select auth.uid()));

create policy "leads: members can read own dealer leads"
  on public.leads for select to authenticated
  using (dealer_id in (select private.user_dealer_ids()));

create policy "leads: admins can read all"
  on public.leads for select to authenticated
  using ((select private.is_admin()));

create policy "leads: members can update own dealer leads"
  on public.leads for update to authenticated
  using (dealer_id in (select private.user_dealer_ids()))
  with check (dealer_id in (select private.user_dealer_ids()));

create policy "leads: admins can update all"
  on public.leads for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "leads: admins can delete"
  on public.leads for delete to authenticated
  using ((select private.is_admin()));

create policy "lead_activities: members can read"
  on public.lead_activities for select to authenticated
  using (exists (
    select 1 from public.leads l
    where l.id = lead_id and l.dealer_id in (select private.user_dealer_ids())
  ));

create policy "lead_activities: admins can read all"
  on public.lead_activities for select to authenticated
  using ((select private.is_admin()));

create policy "lead_activities: members can add"
  on public.lead_activities for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.leads l
      where l.id = lead_id and l.dealer_id in (select private.user_dealer_ids())
    )
  );

create policy "lead_activities: admins can add"
  on public.lead_activities for insert to authenticated
  with check (author_id = (select auth.uid()) and (select private.is_admin()));

create policy "contact_clicks: members can read own dealer"
  on public.contact_clicks for select to authenticated
  using (dealer_id in (select private.user_dealer_ids()));

create policy "contact_clicks: admins can read all"
  on public.contact_clicks for select to authenticated
  using ((select private.is_admin()));

create policy "vehicle_views: members can read own dealer"
  on public.vehicle_views for select to authenticated
  using (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and v.dealer_id in (select private.user_dealer_ids())
  ));

create policy "vehicle_views: admins can read all"
  on public.vehicle_views for select to authenticated
  using ((select private.is_admin()));

------------------------------------------------------------------------------
-- financing
------------------------------------------------------------------------------

create policy "finance_applications: users can read own"
  on public.finance_applications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "finance_applications: members can read own dealer"
  on public.finance_applications for select to authenticated
  using (dealer_id in (select private.user_dealer_ids()));

create policy "finance_applications: admins can read all"
  on public.finance_applications for select to authenticated
  using ((select private.is_admin()));

create policy "finance_applications: members can update status"
  on public.finance_applications for update to authenticated
  using (dealer_id in (select private.user_dealer_ids()))
  with check (dealer_id in (select private.user_dealer_ids()));

create policy "finance_applications: admins can update all"
  on public.finance_applications for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Offers are visible whenever the parent application is (its RLS applies inside the subquery).
create policy "lender_offers: readable with parent application"
  on public.lender_offers for select to authenticated
  using (exists (select 1 from public.finance_applications fa where fa.id = application_id));

------------------------------------------------------------------------------
-- platform
------------------------------------------------------------------------------

create policy "site_settings: public can read"
  on public.site_settings for select to anon, authenticated using (true);

create policy "site_settings: admins can update"
  on public.site_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "push_tokens: users can read own"
  on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_tokens: users can add own"
  on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "push_tokens: users can remove own"
  on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "push_tokens: admins can read all"
  on public.push_tokens for select to authenticated
  using ((select private.is_admin()));

create policy "audit_log: admins can read"
  on public.audit_log for select to authenticated
  using ((select private.is_admin()));
