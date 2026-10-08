begin;
\ir _helpers.psql
select plan(32);

select tests.create_user('ci-owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('ci-manager-a@test.local', 'dealer') as manager_a \gset
select tests.create_user('ci-staff-a@test.local', 'dealer') as staff_a \gset
select tests.create_user('ci-owner-b@test.local', 'dealer') as owner_b \gset
select tests.create_user('ci-buyer@test.local', 'buyer') as buyer \gset
select tests.create_user('ci-newbie@test.local', 'buyer') as newbie \gset
select tests.create_user('ci-admin@test.local', 'admin') as admin \gset
select tests.create_dealer('ci-dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('ci-dealer-b', 'approved', :'owner_b') as dealer_b \gset
select tests.create_dealer('ci-dealer-p', 'pending', :'buyer') as dealer_p \gset
insert into public.dealer_members (dealer_id, user_id, role) values
  (:'dealer_a', :'manager_a', 'manager'), (:'dealer_a', :'staff_a', 'staff');

select tests.create_vehicle(:'dealer_a', 'draft', false) as draft_a \gset
select tests.create_vehicle(:'dealer_a', 'active') as live_a \gset
select tests.create_vehicle(:'dealer_b', 'draft', false) as draft_b \gset
select id as feature_1 from public.features order by id limit 1 \gset
select id as feature_2 from public.features order by id offset 1 limit 1 \gset

------------------------------------------------------------------------------
-- vehicle_cards console columns
------------------------------------------------------------------------------
select tests.authenticate_as(:'owner_a');
select ok(
  (select updated_at is not null and vin is null from public.vehicle_cards where id = :'draft_a'),
  'vehicle_cards exposes vin and updated_at'
);

------------------------------------------------------------------------------
-- add_vehicle_images
------------------------------------------------------------------------------
select lives_ok(
  format($$select public.add_vehicle_images(%L, %L::jsonb)$$, :'draft_a',
    jsonb_build_array(
      jsonb_build_object('storage_path', :'dealer_a' || '/' || :'draft_a' || '/a.webp', 'width', 1600, 'height', 1200, 'blurhash', 'LKO2'),
      jsonb_build_object('storage_path', :'dealer_a' || '/' || :'draft_a' || '/b.webp')
    )),
  'member adds two photos'
);
select is(
  (select array_agg(position order by position) from public.vehicle_images where vehicle_id = :'draft_a'),
  array[0, 1]::smallint[], 'photos get consecutive positions from 0'
);
select lives_ok(
  format($$select public.add_vehicle_images(%L, %L::jsonb)$$, :'draft_a',
    jsonb_build_array(jsonb_build_object('storage_path', :'dealer_a' || '/' || :'draft_a' || '/c.webp'))),
  'member appends a third photo'
);
select is(
  (select position from public.vehicle_images where storage_path like '%/c.webp'), 2::smallint,
  'appended photo goes after the last one'
);
select throws_ok(
  format($$select public.add_vehicle_images(%L, %L::jsonb)$$, :'draft_a',
    jsonb_build_array(jsonb_build_object('storage_path', :'dealer_b' || '/' || :'draft_b' || '/x.webp'))),
  'P0001', null, 'photo paths outside the vehicle folder are rejected'
);
select throws_ok(
  format($$select public.add_vehicle_images(%L, %L::jsonb)$$, :'draft_a',
    jsonb_build_array(jsonb_build_object('storage_path', :'dealer_a' || '/' || :'draft_a' || '/../../x.webp'))),
  'P0001', null, 'path traversal is rejected'
);
select throws_ok(
  format($$select public.add_vehicle_images(%L, '[]'::jsonb)$$, :'draft_a'),
  'P0001', 'MISSING_FIELDS: images', 'an empty batch is rejected'
);
select throws_ok(
  format($$select public.add_vehicle_images(%L, %L::jsonb)$$, :'draft_a',
    (select jsonb_agg(jsonb_build_object('storage_path', :'dealer_a' || '/' || :'draft_a' || '/' || g || '.webp'))
     from generate_series(1, 38) g)),
  'P0001', 'TOO_MANY_IMAGES: a listing can have at most 40 photos', 'at most 40 photos per listing'
);

select tests.authenticate_as(:'owner_b');
select throws_ok(
  format($$select public.add_vehicle_images(%L, %L::jsonb)$$, :'draft_a',
    jsonb_build_array(jsonb_build_object('storage_path', :'dealer_a' || '/' || :'draft_a' || '/z.webp'))),
  'P0001', null, 'dealer B cannot add photos to dealer A''s vehicle (not visible)'
);

-- dealer A's live listing is publicly visible, so the RPC finds it, but RLS blocks the insert
select throws_ok(
  format($$select public.add_vehicle_images(%L, %L::jsonb)$$, :'live_a',
    jsonb_build_array(jsonb_build_object('storage_path', :'dealer_a' || '/' || :'live_a' || '/z.webp'))),
  '42501', null, 'dealer B cannot add photos to dealer A''s live vehicle (RLS)'
);

------------------------------------------------------------------------------
-- last photo guard
------------------------------------------------------------------------------
select tests.authenticate_as(:'owner_a');
select throws_ok(
  format($$delete from public.vehicle_images where vehicle_id = %L$$, :'live_a'),
  'P0001', null, 'the last photo of a live listing cannot be deleted'
);
select lives_ok(
  format($$delete from public.vehicle_images where vehicle_id = %L and position = 0$$, :'draft_a'),
  'photos of a draft can be deleted'
);
select lives_ok(
  format($$select public.reorder_vehicle_images(%L, (select array_agg(id order by position desc) from public.vehicle_images where vehicle_id = %L))$$, :'draft_a', :'draft_a'),
  'reorder after a delete renumbers from 0'
);
select is(
  (select array_agg(position order by position) from public.vehicle_images where vehicle_id = :'draft_a'),
  array[0, 1]::smallint[], 'positions are compact after reorder'
);

------------------------------------------------------------------------------
-- set_vehicle_features
------------------------------------------------------------------------------
select lives_ok(
  format($$select public.set_vehicle_features(%L, array[%s, %s]::smallint[])$$, :'draft_a', :'feature_1', :'feature_2'),
  'member sets two features'
);
select lives_ok(
  format($$select public.set_vehicle_features(%L, array[%s]::smallint[])$$, :'draft_a', :'feature_2'),
  'member replaces the feature set'
);
select is(
  (select array_agg(feature_id) from public.vehicle_features where vehicle_id = :'draft_a'),
  array[:'feature_2']::smallint[], 'only the new feature set remains'
);
select tests.authenticate_as(:'owner_b');
select throws_ok(
  format($$select public.set_vehicle_features(%L, array[%s]::smallint[])$$, :'draft_a', :'feature_1'),
  'P0001', null, 'dealer B cannot change dealer A''s features'
);

------------------------------------------------------------------------------
-- is_featured is admin-only
------------------------------------------------------------------------------
select tests.authenticate_as(:'owner_a');
select throws_ok(
  format($$update public.vehicles set is_featured = true where id = %L$$, :'live_a'),
  'P0001', 'FORBIDDEN: only admins can feature listings', 'dealers cannot feature their listings'
);
select lives_ok(
  format($$update public.vehicles set price_cents = 2499000 where id = %L$$, :'live_a'),
  'dealers can still edit other columns'
);
select tests.authenticate_as(:'admin');
select lives_ok(
  format($$update public.vehicles set is_featured = true where id = %L$$, :'live_a'),
  'admins can feature listings'
);

------------------------------------------------------------------------------
-- team management
------------------------------------------------------------------------------
select tests.authenticate_as(:'staff_a');
select is(
  (select count(*)::int from public.get_dealer_team(:'dealer_a')), 3,
  'members can list their team'
);
select is(
  (select email from public.get_dealer_team(:'dealer_a') where role = 'owner'), 'ci-owner-a@pgtap.test',
  'team list includes emails, owner first'
);
select throws_ok(
  format($$select public.add_dealer_member(%L, 'ci-newbie@pgtap.test', 'staff')$$, :'dealer_a'),
  'P0001', 'FORBIDDEN: only owners and managers can add team members', 'staff cannot add members'
);

select tests.authenticate_as(:'owner_b');
select throws_ok(
  format($$select * from public.get_dealer_team(%L)$$, :'dealer_a'),
  'P0001', 'FORBIDDEN: not a member of this dealer', 'other dealers cannot list the team'
);

select tests.authenticate_as(:'manager_a');
select throws_ok(
  format($$select public.add_dealer_member(%L, 'ci-newbie@pgtap.test', 'owner')$$, :'dealer_a'),
  'P0001', null, 'managers cannot add owners'
);
select lives_ok(
  format($$select public.add_dealer_member(%L, 'CI-Newbie@pgtap.test', 'staff')$$, :'dealer_a'),
  'managers add staff by email (case-insensitive)'
);
select tests.clear_authentication();
select is(
  (select role from public.profiles where id = :'newbie'), 'dealer'::public.app_role,
  'joining an approved dealer grants console access'
);
select tests.authenticate_as(:'owner_a');
select throws_ok(
  format($$select public.add_dealer_member(%L, 'nobody@pgtap.test')$$, :'dealer_a'),
  'P0001', 'USER_NOT_FOUND: no account uses that email; ask them to sign up first', 'unknown emails are rejected'
);

------------------------------------------------------------------------------
-- admin_list_users
------------------------------------------------------------------------------
select throws_ok(
  $$select * from public.admin_list_users()$$,
  'P0001', 'FORBIDDEN: admin only', 'non-admins cannot list users'
);
select tests.authenticate_as(:'admin');
select is(
  (select dealer_count from public.admin_list_users('ci-owner-a')), 1,
  'admins search users by email and see membership counts'
);

select tests.clear_authentication();
select * from finish();
rollback;
