begin;
\ir _helpers.psql
select plan(16);

select tests.create_user('owner@test.local', 'dealer') as owner \gset
select tests.create_user('pending@test.local') as pending_owner \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('gate-dealer', 'approved', :'owner') as dealer \gset
select tests.create_dealer('gate-pending', 'pending', :'pending_owner') as dealer_p \gset
select tests.create_vehicle(:'dealer', 'draft', false) as no_image \gset
select tests.create_vehicle(:'dealer', 'draft') as ready \gset
select tests.create_vehicle(:'dealer_p', 'draft') as pending_vehicle \gset

select tests.authenticate_as(:'owner');

select matches(
  (select slug::text from public.vehicles where id = :'ready'),
  '^2022-[a-z0-9-]+-[0-9a-f]{8}$', 'slug is generated as year-make-model-shortid'
);
select ok((select search_vector is not null from public.vehicles where id = :'ready'), 'search vector is populated');

select throws_like(
  format($$update public.vehicles set status = 'active' where id = %L$$, :'no_image'),
  'MISSING_IMAGES%', 'cannot publish without photos'
);

update public.vehicles set exterior_color = null where id = :'ready';
select throws_like(
  format($$update public.vehicles set status = 'active' where id = %L$$, :'ready'),
  'MISSING_FIELDS: exterior_color%', 'cannot publish with missing required specs'
);
update public.vehicles set exterior_color = 'Black', year = 2099 where id = :'ready';
select throws_like(
  format($$update public.vehicles set status = 'active' where id = %L$$, :'ready'),
  'INVALID_YEAR%', 'cannot publish a model year beyond next year'
);
update public.vehicles set year = 2022 where id = :'ready';

select is(
  (select public.set_vehicle_status(:'ready', 'active')), 'active'::public.listing_status,
  'set_vehicle_status publishes a complete listing'
);
select ok((select published_at is not null from public.vehicles where id = :'ready'), 'published_at is set on publish');

select lives_ok(format($$update public.vehicles set status = 'sold' where id = %L$$, :'ready'), 'can mark as sold');
select ok((select sold_at is not null from public.vehicles where id = :'ready'), 'sold_at is set when sold');
update public.vehicles set status = 'active' where id = :'ready';
select ok((select sold_at is null from public.vehicles where id = :'ready'), 'sold_at clears when relisted');

select throws_like(
  $$insert into public.vehicles (dealer_id, make_id, model_id, year, status, created_by, price_cents, mileage,
                                body_type, fuel_type, drivetrain, transmission, exterior_color)
    select (select d.id from public.dealers d where d.slug = 'gate-dealer'), m.make_id, m.id, 2022, 'active', auth.uid(),
           2000000, 10, 'sedan', 'gasoline', 'fwd', 'automatic', 'Red'
    from public.models m order by m.id limit 1$$,
  'MISSING_IMAGES%', 'cannot insert directly as active'
);
select throws_like(
  format($$update public.vehicles set model_id = (select max(id) from public.models) where id = %L$$, :'ready'),
  'INVALID_MODEL%', 'model must belong to the make'
);

-- pending dealers can only keep drafts
select tests.authenticate_as(:'pending_owner');
select throws_like(
  format($$update public.vehicles set status = 'active' where id = %L$$, :'pending_vehicle'),
  'DEALER_NOT_APPROVED%', 'pending dealers cannot publish'
);

-- listing review mode
select tests.clear_authentication();
update public.site_settings set require_listing_review = true where id = 1;
update public.vehicles set status = 'draft' where id = :'ready';
select tests.authenticate_as(:'owner');
select is(
  (select public.set_vehicle_status(:'ready', 'active')), 'pending_review'::public.listing_status,
  'with review on, dealer publish goes to pending_review'
);
select is(
  (select public.set_vehicle_status(:'ready', 'active')), 'pending_review'::public.listing_status,
  'dealer cannot self-approve out of review'
);
select tests.authenticate_as(:'admin');
select is(
  (select public.set_vehicle_status(:'ready', 'active')), 'active'::public.listing_status,
  'admin approves a reviewed listing'
);

select * from finish();
rollback;
