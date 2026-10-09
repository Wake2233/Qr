begin;
\ir _helpers.psql
select plan(14);

select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_user('buyer2@test.local') as buyer2 \gset
select tests.create_user('owner@test.local', 'dealer') as owner \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('plat-dealer', 'approved', :'owner') as dealer \gset
select tests.create_vehicle(:'dealer', 'active') as vehicle \gset
insert into public.vin_decodes (vin, payload) values ('1HGCM82633A004352', '{"Make":"HONDA"}');

-- favorites
select tests.authenticate_as(:'buyer');
select lives_ok(format($$insert into public.favorites (user_id, vehicle_id) values (%L, %L)$$, :'buyer', :'vehicle'), 'buyer can save a favorite');
select throws_ok(
  format($$insert into public.favorites (user_id, vehicle_id) values (%L, %L)$$, :'buyer2', :'vehicle'),
  '42501', null, 'cannot save favorites for someone else'
);
select tests.authenticate_as(:'buyer2');
select is((select count(*)::int from public.favorites), 0, 'favorites are private');

-- site settings
select tests.authenticate_as_anon();
select is((select default_whatsapp_e164::text from public.site_settings where id = 1), '+13473700570', 'anon can read public settings');
select tests.authenticate_as(:'owner');
select results_eq(
  $$with u as (update public.site_settings set brand_name = 'Hijacked' where id = 1 returning 1) select count(*)::int from u$$,
  $$values (0)$$, 'dealers cannot change site settings'
);
select tests.authenticate_as(:'admin');
select results_eq(
  $$with u as (update public.site_settings set brand_name = 'Test Brand' where id = 1 returning 1) select count(*)::int from u$$,
  $$values (1)$$, 'admins can change site settings'
);
select throws_ok($$insert into public.site_settings (id) values (2)$$, '42501', null, 'settings stay a single row');

-- push tokens
select tests.authenticate_as(:'owner');
select lives_ok(format($$insert into public.push_tokens (user_id, token, platform) values (%L, 'ExponentPushToken[abc]', 'ios')$$, :'owner'), 'user can register own push token');
select throws_ok(
  format($$insert into public.push_tokens (user_id, token, platform) values (%L, 'ExponentPushToken[evil]', 'ios')$$, :'buyer'),
  '42501', null, 'cannot register tokens for someone else'
);
select tests.authenticate_as(:'buyer');
select is((select count(*)::int from public.push_tokens), 0, 'push tokens are private');

-- VIN decode cache: dealers only, read-only
select is((select count(*)::int from public.vin_decodes), 0, 'buyers cannot read the VIN cache');
select tests.authenticate_as(:'owner');
select is((select count(*)::int from public.vin_decodes where vin = '1HGCM82633A004352'), 1, 'dealers can read the VIN cache');
select throws_ok($$insert into public.vin_decodes (vin, payload) values ('1HGCM82633A004353', '{}')$$, '42501', null, 'VIN cache is written by the edge function only');

-- catalog is admin-managed
select throws_ok($$insert into public.makes (name, slug) values ('Fake', 'fake')$$, '42501', null, 'dealers cannot edit the catalog');

select * from finish();
rollback;
