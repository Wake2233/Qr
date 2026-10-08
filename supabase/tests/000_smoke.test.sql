begin;
\ir _helpers.psql
select plan(3);

select has_table('public', 'vehicles', 'vehicles table exists');
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'every public table has RLS enabled'
);
select ok(tests.create_user('smoke@test.local') is not null, 'test helper can create users');

select * from finish();
rollback;
