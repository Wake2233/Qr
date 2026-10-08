begin;
\ir _helpers.psql
select plan(13);

select tests.create_user('owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('owner-b@test.local', 'dealer') as owner_b \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('img-dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('img-dealer-b', 'approved', :'owner_b') as dealer_b \gset
select tests.create_vehicle(:'dealer_a', 'active') as a_active \gset
select tests.create_vehicle(:'dealer_a', 'draft') as a_draft \gset
select tests.create_vehicle(:'dealer_b', 'active') as b_active \gset
insert into public.vehicle_images (vehicle_id, storage_path, position) values
  (:'a_active', 'x/1.jpg', 1), (:'a_active', 'x/2.jpg', 2);
insert into public.vehicle_features (vehicle_id, feature_id)
  select :'a_active', id from public.features order by id limit 3;

-- reads follow the parent vehicle
select tests.authenticate_as_anon();
select is((select count(*)::int from public.vehicle_images where vehicle_id = :'a_active'), 3, 'anon sees images of live listings');
select is((select count(*)::int from public.vehicle_images where vehicle_id = :'a_draft'), 0, 'anon cannot see draft images');
select is((select count(*)::int from public.vehicle_features where vehicle_id = :'a_active'), 3, 'anon sees features of live listings');
select throws_ok(
  format($$insert into public.vehicle_images (vehicle_id, storage_path, position) values (%L, 'evil.jpg', 9)$$, :'a_active'),
  '42501', null, 'anon cannot add images'
);

-- members manage own
select tests.authenticate_as(:'owner_a');
select is((select count(*)::int from public.vehicle_images where vehicle_id = :'a_draft'), 1, 'dealer sees own draft images');
select lives_ok(
  format($$insert into public.vehicle_images (vehicle_id, storage_path, position) values (%L, 'a/3.jpg', 3)$$, :'a_active'),
  'dealer can add images to own vehicle'
);
select throws_ok(
  format($$insert into public.vehicle_images (vehicle_id, storage_path, position) values (%L, 'b/9.jpg', 9)$$, :'b_active'),
  '42501', null, 'dealer cannot add images to another dealers vehicle'
);
select results_eq(
  format($$with d as (delete from public.vehicle_images where vehicle_id = %L returning 1) select count(*)::int from d$$, :'b_active'),
  $$values (0)$$, 'dealer cannot delete another dealers images'
);
select throws_ok(
  format($$insert into public.vehicle_features (vehicle_id, feature_id) select %L, max(id) from public.features$$, :'b_active'),
  '42501', null, 'dealer cannot tag features on another dealers vehicle'
);

-- reorder_vehicle_images RPC
select lives_ok(
  format($$select public.reorder_vehicle_images(%L, array(
    select id from public.vehicle_images where vehicle_id = %L order by position desc))$$, :'a_active', :'a_active'),
  'dealer can reorder own images'
);
select is(
  (select storage_path from public.vehicle_images where vehicle_id = :'a_active' and position = 0),
  'a/3.jpg', 'reorder moved the last image to the cover position'
);
select throws_like(
  format($$select public.reorder_vehicle_images(%L, array(
    select id from public.vehicle_images where vehicle_id = %L limit 1))$$, :'a_active', :'a_active'),
  'INVALID_ORDER%', 'reorder requires every image id'
);
select tests.authenticate_as(:'owner_b');
select throws_like(
  format($$select public.reorder_vehicle_images(%L, array[gen_random_uuid()])$$, :'a_active'),
  'INVALID_ORDER%', 'other dealers cannot reorder (images are invisible to them)'
);

select * from finish();
rollback;
