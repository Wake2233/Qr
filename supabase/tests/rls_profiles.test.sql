begin;
\ir _helpers.psql
select plan(11);

select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_user('buyer2@test.local') as buyer2 \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_user('owner@test.local', 'dealer') as owner \gset
select tests.create_user('staff@test.local', 'dealer') as staff \gset
select tests.create_dealer('profiles-dealer', 'approved', :'owner') as dealer \gset
insert into public.dealer_members (dealer_id, user_id, role) values (:'dealer', :'staff', 'staff');

-- anon
select tests.authenticate_as_anon();
select is((select count(*)::int from public.profiles), 0, 'anon cannot read profiles');

-- buyer
select tests.authenticate_as(:'buyer');
select is((select count(*)::int from public.profiles), 1, 'buyer sees only own profile');
select is((select count(*)::int from public.profiles where id = :'buyer2'), 0, 'buyer cannot read another buyer');
select lives_ok(
  format($$update public.profiles set full_name = 'Buyer One' where id = %L$$, :'buyer'),
  'buyer can update own name'
);
select throws_ok(
  format($$update public.profiles set role = 'admin' where id = %L$$, :'buyer'),
  '42501', null, 'buyer cannot change own role (column grant)'
);
select results_eq(
  format($$with u as (update public.profiles set full_name = 'x' where id = %L returning 1) select count(*)::int from u$$, :'buyer2'),
  $$values (0)$$, 'buyer cannot update another profile'
);
select throws_ok(
  format($$insert into public.profiles (id) values (%L)$$, gen_random_uuid()),
  '42501', null, 'buyer cannot insert profiles'
);

-- dealer teammates
select tests.authenticate_as(:'staff');
select is((select count(*)::int from public.profiles where id = :'owner'), 1, 'staff can read teammate');
select is((select count(*)::int from public.profiles where id = :'buyer'), 0, 'staff cannot read unrelated buyer');

-- admin
select tests.authenticate_as(:'admin');
select ok((select count(*) from public.profiles) >= 5, 'admin can read all profiles');
select tests.clear_authentication();
select is((select full_name from public.profiles where id = :'buyer'), 'Buyer One', 'own name update persisted');

select * from finish();
rollback;
