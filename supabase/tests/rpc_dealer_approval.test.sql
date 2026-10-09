begin;
\ir _helpers.psql
select plan(19);

select tests.create_user('applicant@test.local') as applicant \gset
select tests.create_user('applicant2@test.local') as applicant2 \gset
select tests.create_user('buyer@test.local') as buyer \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset

-- apply_as_dealer
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.apply_as_dealer('{"display_name":"Anon Cars"}')$$,
  '42501', null, 'anon cannot apply'
);
select tests.authenticate_as(:'applicant');
select throws_like(
  $$select public.apply_as_dealer('{"display_name":"No Phone Motors"}')$$,
  'MISSING_FIELDS%', 'phone and WhatsApp are required'
);
select public.apply_as_dealer(jsonb_build_object(
  'display_name', 'Shore Auto Sales', 'phone_e164', '+17325550123', 'whatsapp_e164', '+17325550123',
  'city', 'Asbury Park', 'state', 'NJ', 'license_number', 'NJ-123'
)) as applied \gset
select is((select status from public.dealers where id = :'applied'), 'pending'::public.dealer_status, 'application starts pending');
select is((select role from public.dealer_members where dealer_id = :'applied' and user_id = :'applicant'),
  'owner'::public.dealer_member_role, 'applicant becomes owner');
select is((select license_number from public.dealer_private where dealer_id = :'applied'), 'NJ-123', 'license stored privately');
select matches((select slug::text from public.dealers where id = :'applied'), '^shore-auto-sales-[0-9a-f]{6}$', 'slug generated from name');
select throws_like(
  $$select public.apply_as_dealer('{"display_name":"Second Try","phone_e164":"+17325550124","whatsapp_e164":"+17325550124"}')$$,
  'APPLICATION_PENDING%', 'one pending application at a time'
);

-- moderation is admin-only
select tests.authenticate_as(:'buyer');
select throws_like(format($$select public.approve_dealer(%L)$$, :'applied'), 'FORBIDDEN%', 'buyers cannot approve');
select tests.authenticate_as(:'applicant');
select throws_like(format($$select public.approve_dealer(%L)$$, :'applied'), 'FORBIDDEN%', 'applicants cannot self-approve');

select tests.authenticate_as(:'admin');
select lives_ok(format($$select public.approve_dealer(%L)$$, :'applied'), 'admin approves');
select tests.clear_authentication();
select results_eq(
  format($$select status, approved_by from public.dealers where id = %L$$, :'applied'),
  format($$values ('approved'::public.dealer_status, %L::uuid)$$, :'admin'),
  'approval records status and approver'
);
select is((select role from public.profiles where id = :'applicant'), 'dealer'::public.app_role, 'members are promoted to dealer');
select ok(exists (select 1 from public.audit_log where entity = 'dealers' and entity_id = :'applied'), 'status change is audited');

select tests.authenticate_as(:'applicant2');
select public.apply_as_dealer('{"display_name":"Rejected Rides","phone_e164":"+17325550125","whatsapp_e164":"+17325550125"}') as rejected \gset
select tests.authenticate_as(:'admin');
select lives_ok(format($$select public.reject_dealer(%L, 'Missing license')$$, :'rejected'), 'admin rejects with a reason');
select is((select rejection_reason from public.dealers where id = :'rejected'), 'Missing license', 'reason stored');
select lives_ok(format($$select public.suspend_dealer(%L, 'Policy violation')$$, :'applied'), 'admin suspends');
select is((select status from public.dealers where id = :'applied'), 'suspended'::public.dealer_status, 'dealer suspended');

-- set_user_role
select lives_ok(format($$select public.set_user_role(%L, 'admin')$$, :'buyer'), 'admin can promote another admin');
select tests.authenticate_as(:'buyer');
select lives_ok(format($$select public.set_user_role(%L, 'buyer')$$, :'admin'), 'admins can demote other admins while one remains');

select * from finish();
rollback;
