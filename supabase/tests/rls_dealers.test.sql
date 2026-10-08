begin;
\ir _helpers.psql
select plan(21);

select tests.create_user('owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('manager-a@test.local', 'dealer') as manager_a \gset
select tests.create_user('staff-a@test.local', 'dealer') as staff_a \gset
select tests.create_user('owner-b@test.local', 'dealer') as owner_b \gset
select tests.create_user('pending-owner@test.local') as pending_owner \gset
select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('dealer-b', 'approved', :'owner_b') as dealer_b \gset
select tests.create_dealer('dealer-pending', 'pending', :'pending_owner') as dealer_p \gset
insert into public.dealer_members (dealer_id, user_id, role) values
  (:'dealer_a', :'manager_a', 'manager'), (:'dealer_a', :'staff_a', 'staff');

-- dealers: visibility
select tests.authenticate_as_anon();
select is(
  (select count(*)::int from public.dealers where id in (:'dealer_a', :'dealer_b', :'dealer_p')),
  2, 'anon sees only approved dealers'
);
select tests.authenticate_as(:'buyer');
select is((select count(*)::int from public.dealers where id = :'dealer_p'), 0, 'buyer cannot see pending dealer');
select tests.authenticate_as(:'pending_owner');
select is((select count(*)::int from public.dealers where id = :'dealer_p'), 1, 'pending owner sees own dealer');
select tests.authenticate_as(:'admin');
select is((select count(*)::int from public.dealers where id = :'dealer_p'), 1, 'admin sees pending dealer');

-- dealers: updates
select tests.authenticate_as(:'owner_a');
select results_eq(
  format($$with u as (update public.dealers set display_name = 'Dealer A Motors' where id = %L returning 1) select count(*)::int from u$$, :'dealer_a'),
  $$values (1)$$, 'owner can update own dealer'
);
select results_eq(
  format($$with u as (update public.dealers set display_name = 'Hijack' where id = %L returning 1) select count(*)::int from u$$, :'dealer_b'),
  $$values (0)$$, 'owner cannot update another dealer'
);
select throws_ok(
  format($$update public.dealers set status = 'approved' where id = %L$$, :'dealer_a'),
  '42501', null, 'owner cannot change dealer status directly'
);
select throws_ok(
  $$insert into public.dealers (slug, display_name) values ('rogue-dealer', 'Rogue')$$,
  '42501', null, 'authenticated users cannot insert dealers directly'
);
select tests.authenticate_as(:'staff_a');
select results_eq(
  format($$with u as (update public.dealers set display_name = 'Staff Edit' where id = %L returning 1) select count(*)::int from u$$, :'dealer_a'),
  $$values (0)$$, 'staff cannot update dealer profile'
);

-- dealer_private
select tests.authenticate_as(:'owner_a');
select is((select count(*)::int from public.dealer_private where dealer_id = :'dealer_a'), 1, 'member reads own private data');
select is((select count(*)::int from public.dealer_private where dealer_id = :'dealer_b'), 0, 'member cannot read other dealer private data');
select tests.authenticate_as(:'buyer');
select is((select count(*)::int from public.dealer_private), 0, 'buyer cannot read dealer private data');
select tests.authenticate_as_anon();
select is((select count(*)::int from public.dealer_private), 0, 'anon cannot read dealer private data');

-- dealer_members
select tests.authenticate_as(:'owner_a');
select is((select count(*)::int from public.dealer_members where dealer_id = :'dealer_a'), 3, 'owner sees whole team');
select tests.authenticate_as(:'owner_b');
select is((select count(*)::int from public.dealer_members where dealer_id = :'dealer_a'), 0, 'other dealer cannot see team');
select tests.authenticate_as(:'manager_a');
select throws_ok(
  format($$insert into public.dealer_members (dealer_id, user_id, role) values (%L, %L, 'owner')$$, :'dealer_a', :'buyer'),
  '42501', null, 'manager cannot add an owner'
);
select lives_ok(
  format($$insert into public.dealer_members (dealer_id, user_id, role) values (%L, %L, 'staff')$$, :'dealer_a', :'buyer'),
  'manager can add staff'
);
select results_eq(
  format($$with d as (delete from public.dealer_members where dealer_id = %L and user_id = %L returning 1) select count(*)::int from d$$, :'dealer_a', :'owner_a'),
  $$values (0)$$, 'manager cannot remove an owner'
);
select tests.authenticate_as(:'staff_a');
select throws_ok(
  format($$insert into public.dealer_members (dealer_id, user_id, role) values (%L, %L, 'staff')$$, :'dealer_a', :'pending_owner'),
  '42501', null, 'staff cannot add members'
);
select tests.authenticate_as(:'owner_a');
select throws_like(
  format($$delete from public.dealer_members where dealer_id = %L and user_id = %L$$, :'dealer_a', :'owner_a'),
  'LAST_OWNER%', 'the last owner cannot leave'
);

-- admin can delete a dealer (cascade skips the last-owner guard)
select tests.authenticate_as(:'admin');
select lives_ok(format($$delete from public.dealers where id = %L$$, :'dealer_b'), 'admin can delete a dealer');

select * from finish();
rollback;
