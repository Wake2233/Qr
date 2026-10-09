begin;
\ir _helpers.psql
select plan(14);

-- private.search_query: free text -> prefix tsquery (mirrors @cp/core buildSearchQuery)
select is(private.search_query('  Cam  RY!! '), to_tsquery('simple', 'cam:* & ry:*'), 'words become ANDed prefixes');
select is(private.search_query('x5 / M-Sport'), to_tsquery('simple', 'x5:* & m:* & sport:*'), 'punctuation splits words');
select is(private.search_query('!!! ---'), null, 'no words -> null (no text filter)');
select is(private.search_query(''), null, 'empty -> null');
select is(private.search_query(null), null, 'null -> null');
select is(
  private.search_query('a b c d e f g h i j'),
  to_tsquery('simple', 'a:* & b:* & c:* & d:* & e:* & f:* & g:* & h:*'),
  'at most 8 words are used'
);

select tests.create_user('ss-owner@test.local', 'dealer') as owner \gset
select tests.create_dealer('ss-dealer', 'approved', :'owner') as dealer \gset
select tests.create_vehicle(:'dealer', 'active') as zephyr \gset
select tests.create_vehicle(:'dealer', 'active') as other \gset
update public.vehicles set trim = 'Zephyrline Touring' where id = :'zephyr';

select tests.authenticate_as_anon();
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"zeph"}') ->> 'total')::int, 1,
  'facets: a partial word matches (search as you type)'
);
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"zeph tour"}') ->> 'total')::int, 1,
  'facets: every word must match'
);
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"zeph nomatch"}') ->> 'total')::int, 0,
  'facets: a word that matches nothing excludes the listing'
);
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"%%%"}') ->> 'total')::int, 2,
  'facets: punctuation-only search is ignored, not an error'
);

-- punctuation in model names: "F-150" is findable as "f-150", "f 150", "f150" and "f15"
select tests.clear_authentication();
select id as f150_model, make_id as f150_make from public.models where slug = 'f-150' \gset
update public.vehicles set make_id = :f150_make, model_id = :f150_model, trim = 'XLT SuperCrew'
  where id = :'other';
select tests.authenticate_as_anon();
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"f-150"}') ->> 'total')::int, 1, 'hyphenated model'
);
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"f150"}') ->> 'total')::int, 1, 'model without separator'
);
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"F15"}') ->> 'total')::int, 1, 'partial compact model'
);
select is(
  (public.get_inventory_facets('{"dealer":"ss-dealer","q":"supercr"}') ->> 'total')::int, 1, 'partial trim'
);

select tests.clear_authentication();
select * from finish();
rollback;
