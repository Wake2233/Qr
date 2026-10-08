begin;
\ir _helpers.psql
select plan(19);

select tests.create_user('owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('owner-b@test.local', 'dealer') as owner_b \gset
select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_user('buyer2@test.local') as buyer2 \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('lead-dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('lead-dealer-b', 'approved', :'owner_b') as dealer_b \gset
select tests.create_vehicle(:'dealer_a', 'active') as a_active \gset
select tests.create_vehicle(:'dealer_a', 'draft') as a_draft \gset

insert into public.leads (id, dealer_id, vehicle_id, user_id, name, email)
values ('11111111-1111-4111-8111-111111111111', :'dealer_a', :'a_active', :'buyer', 'Buyer', 'buyer@test.local'),
       ('22222222-2222-4222-8222-222222222222', :'dealer_b', null, null, 'Walk In', 'walkin@test.local');
\set lead_a '11111111-1111-4111-8111-111111111111'
\set lead_b '22222222-2222-4222-8222-222222222222'

-- leads
select tests.authenticate_as_anon();
select is((select count(*)::int from public.leads), 0, 'anon cannot read leads');
select tests.authenticate_as(:'buyer');
select is((select count(*)::int from public.leads), 1, 'buyer sees own inquiries only');
select throws_ok(
  format($$insert into public.leads (dealer_id, name, email) values (%L, 'x', 'x@test.local')$$, :'dealer_a'),
  '42501', null, 'buyers cannot insert leads directly (RPC only)'
);
select tests.authenticate_as(:'buyer2');
select is((select count(*)::int from public.leads), 0, 'other buyers see nothing');

select tests.authenticate_as(:'owner_a');
select is((select count(*)::int from public.leads where id in (:'lead_a', :'lead_b')), 1, 'dealer sees only own dealer leads');
select results_eq(
  format($$with u as (update public.leads set status = 'contacted' where id = %L returning 1) select count(*)::int from u$$, :'lead_a'),
  $$values (1)$$, 'dealer can move own lead through the pipeline'
);
select results_eq(
  format($$with u as (update public.leads set status = 'lost' where id = %L returning 1) select count(*)::int from u$$, :'lead_b'),
  $$values (0)$$, 'dealer cannot touch another dealers lead'
);
select throws_ok(
  format($$update public.leads set name = 'Edited' where id = %L$$, :'lead_a'),
  '42501', null, 'customer details are immutable (column grant)'
);

-- lead_activities
select lives_ok(
  format($$insert into public.lead_activities (lead_id, author_id, kind, body) values (%L, %L, 'note', 'Called back')$$, :'lead_a', :'owner_a'),
  'dealer can add a note to own lead'
);
select throws_ok(
  format($$insert into public.lead_activities (lead_id, author_id, kind) values (%L, %L, 'note')$$, :'lead_b', :'owner_a'),
  '42501', null, 'dealer cannot add notes to another dealers lead'
);
select throws_ok(
  format($$insert into public.lead_activities (lead_id, author_id, kind) values (%L, %L, 'note')$$, :'lead_a', :'owner_b'),
  '42501', null, 'note author cannot be spoofed'
);
select tests.authenticate_as(:'owner_b');
select is((select count(*)::int from public.lead_activities where lead_id = :'lead_a'), 0, 'other dealers cannot read the timeline');

-- contact clicks + views via RPC
select tests.authenticate_as_anon();
select lives_ok(format($$select public.track_contact_click(%L, 'whatsapp', 'web')$$, :'a_active'), 'anon can log a WhatsApp click');
select lives_ok(format($$select public.track_contact_click(%L, 'call', 'ios')$$, :'a_draft'), 'clicks on drafts are ignored silently');
select lives_ok(format($$select public.record_vehicle_view(%L)$$, :'a_active'), 'anon can record a view');
select throws_ok(
  format($$insert into public.contact_clicks (dealer_id, channel, platform) values (%L, 'call', 'web')$$, :'dealer_a'),
  '42501', null, 'anon cannot insert clicks directly'
);
select tests.authenticate_as(:'owner_a');
select is((select count(*)::int from public.contact_clicks where dealer_id = :'dealer_a'), 1, 'dealer sees own click (draft click ignored)');
select is((select views from public.vehicle_views where vehicle_id = :'a_active'), 1, 'dealer sees own view counts');
select tests.authenticate_as(:'owner_b');
select is((select count(*)::int from public.contact_clicks where dealer_id = :'dealer_a'), 0, 'other dealers cannot see clicks');

select * from finish();
rollback;
