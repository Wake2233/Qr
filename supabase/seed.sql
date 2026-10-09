-- Local demo data (fictional lenders, sub-dealers and 60 listings). Runs on `pnpm db:reset` after
-- seeds/reference.sql (settings, catalog, house dealer). Never loaded into the hosted database.
-- Users and dealer memberships are created by `pnpm db:seed:users`; photos by `pnpm db:seed:images`.

------------------------------------------------------------------------------
-- Simulated lender network (fictional names)
------------------------------------------------------------------------------
insert into public.lenders (name, min_credit_tier, base_apr_bps, max_term_months, max_ltv_pct)
select n, tier::public.credit_tier, apr, term, ltv
from (values
  ('Atlantic Auto Credit','good',590,84,125),('Liberty Lane Finance','excellent',489,84,120),
  ('Garden State Lending','good',629,75,120),('Hudson River Bank','excellent',459,72,115),
  ('Keystone Motor Finance','fair',1090,72,130),('Pinewood Credit Union','good',549,84,125),
  ('Summit Drive Capital','excellent',479,84,120),('Harborline Auto Loans','fair',1190,72,130),
  ('Second Gear Finance','rebuilding',1690,72,140),('Fresh Start Auto Credit','rebuilding',1890,60,140),
  ('Blue Ridge Federal','good',579,84,120),('Metro Auto Funding','fair',1050,72,125),
  ('Northstar Lending Group','excellent',469,84,120),('Cornerstone Auto Bank','good',609,75,120),
  ('Open Road Credit','fair',1150,72,130),('Clearway Finance','good',639,72,120),
  ('Bridgepoint Motor Credit','rebuilding',1790,60,135),('Evergreen Auto Finance','good',569,84,125),
  ('Granite State Lending','excellent',499,72,115),('Lakeside Credit Union','good',529,84,125),
  ('Redline Auto Capital','fair',1240,72,130),('Silver Oak Financial','excellent',449,84,120),
  ('Turnpike Auto Loans','fair',990,72,125),('Union Square Bank','good',599,75,120),
  ('Westbrook Credit','rebuilding',1950,60,140),('Ironbridge Auto Finance','good',649,72,120),
  ('Coastal Drive Lending','excellent',509,84,120),('Mile Marker Credit','fair',1120,72,130),
  ('Patriot Auto Funding','good',589,84,125),('Starlight Finance','rebuilding',1840,60,135),
  ('Maple Leaf Lending','good',619,75,120),('Crossroads Credit Union','fair',1020,72,125),
  ('Highpoint Auto Bank','excellent',489,84,120),('Riverbend Motor Credit','good',559,84,125),
  ('Steadfast Auto Loans','rebuilding',1720,72,135),('Beacon Hill Finance','excellent',469,72,115),
  ('Prairie Wind Credit','fair',1180,72,130),('Harvest Auto Lending','good',609,84,125),
  ('Momentum Credit','fair',1080,72,125),('Pioneer Auto Finance','rebuilding',1990,60,140)
) as l(n, tier, apr, term, ltv);

------------------------------------------------------------------------------
-- Dealers: two fictional sub-dealers (approved, pending); the house dealer is reference data
------------------------------------------------------------------------------
insert into public.dealers (
  id, slug, display_name, legal_name, status, is_house, phone_e164, whatsapp_e164, email,
  address_line1, city, state, postal_code, lat, lng, description, business_hours, approved_at
) values
  ('00000000-0000-4000-8000-000000000002', 'garden-state-auto-group', 'Garden State Auto Group', 'Garden State Auto Group LLC',
   'approved', false, '+17325550142', '+17325550142', 'sales@gardenstate.example',
   '1200 US-1', 'Edison', 'NJ', '08817', 40.5187, -74.4121,
   'Fictional demo sub-dealer.', '{}', now()),
  ('00000000-0000-4000-8000-000000000003', 'hudson-valley-cars', 'Hudson Valley Cars', 'Hudson Valley Cars Inc.',
   'pending', false, '+18455550199', '+18455550199', 'hello@hudsonvalley.example',
   '45 Route 17K', 'Newburgh', 'NY', '12550', 41.5034, -74.0104,
   'Fictional demo dealer awaiting approval.', '{}', null);

insert into public.dealer_private (dealer_id, license_number) values
  ('00000000-0000-4000-8000-000000000002', 'NJ-DLR-0000002'),
  ('00000000-0000-4000-8000-000000000003', 'NY-DLR-0000003');

------------------------------------------------------------------------------
-- Vehicles: 26 realistic base specs x variants = 60 listings
------------------------------------------------------------------------------
create temporary table seed_specs (
  n int primary key, make text, model text, trim text, body text, fuel text, drive text, trans text,
  engine text, cyl int, displ numeric, hp int, tq int, mpg_c int, mpg_h int, ev int,
  doors int, seats int, base_year int, base_price int, base_miles int
) on commit drop;

insert into seed_specs values
  (1,'BMW','X5','xDrive40i','suv','gasoline','awd','automatic','3.0L Turbo I6',6,3.0,375,398,21,26,null,4,5,2021,45990,38000),
  (2,'Toyota','Camry','SE','sedan','gasoline','fwd','automatic','2.5L I4',4,2.5,203,184,28,39,null,4,5,2022,24990,31000),
  (3,'Honda','CR-V','EX-L','suv','gasoline','awd','cvt','1.5L Turbo I4',4,1.5,190,179,27,32,null,4,5,2021,27490,34000),
  (4,'Ford','F-150','XLT SuperCrew','pickup','gasoline','4wd','automatic','3.5L EcoBoost V6',6,3.5,400,500,18,23,null,4,6,2020,36990,52000),
  (5,'Tesla','Model 3','Long Range','sedan','electric','awd','automatic','Dual Motor Electric',0,null,346,389,null,null,333,4,5,2022,32990,28000),
  (6,'Jeep','Wrangler','Unlimited Sahara','suv','gasoline','4wd','automatic','3.6L V6',6,3.6,285,260,17,23,null,4,5,2021,34990,41000),
  (7,'Mercedes-Benz','GLC','GLC 300 4MATIC','suv','gasoline','awd','automatic','2.0L Turbo I4',4,2.0,255,273,22,29,null,4,5,2022,38990,26000),
  (8,'Chevrolet','Silverado 1500','LT Crew Cab','pickup','gasoline','4wd','automatic','5.3L V8',8,5.3,355,383,16,20,null,4,6,2021,39990,45000),
  (9,'Toyota','RAV4','Hybrid XLE','suv','hybrid','awd','cvt','2.5L I4 Hybrid',4,2.5,219,null,41,38,null,4,5,2022,31490,30000),
  (10,'Audi','Q5','Premium Plus','suv','gasoline','awd','automatic','2.0L Turbo I4',4,2.0,261,273,23,28,null,4,5,2021,33990,36000),
  (11,'Honda','Civic','Sport','sedan','gasoline','fwd','cvt','2.0L I4',4,2.0,158,138,30,37,null,4,5,2023,23490,18000),
  (12,'Ford','Mustang','GT Premium','coupe','gasoline','rwd','manual','5.0L V8',8,5.0,460,420,15,24,null,2,4,2020,33990,29000),
  (13,'Hyundai','Ioniq 5','SEL AWD','suv','electric','awd','automatic','Dual Motor Electric',0,null,320,446,null,null,256,4,5,2023,34990,15000),
  (14,'Lexus','RX','RX 350 F Sport','suv','gasoline','awd','automatic','3.5L V6',6,3.5,295,263,19,26,null,4,5,2021,41990,33000),
  (15,'Subaru','Outback','Limited','wagon','gasoline','awd','cvt','2.5L H4',4,2.5,182,176,26,33,null,4,5,2021,27990,39000),
  (16,'Ram','1500','Big Horn Crew Cab','pickup','gasoline','4wd','automatic','5.7L HEMI V8',8,5.7,395,410,15,22,null,4,6,2020,33490,58000),
  (17,'Kia','Telluride','EX AWD','suv','gasoline','awd','automatic','3.8L V6',6,3.8,291,262,18,24,null,4,8,2022,38490,27000),
  (18,'Porsche','Macan','S','suv','gasoline','awd','dct','2.9L Twin-Turbo V6',6,2.9,375,383,17,22,null,4,5,2020,52990,31000),
  (19,'Toyota','Tacoma','TRD Off-Road','pickup','gasoline','4wd','automatic','3.5L V6',6,3.5,278,265,18,22,null,4,5,2021,36490,36000),
  (20,'Volkswagen','Golf GTI','S','hatchback','gasoline','fwd','manual','2.0L Turbo I4',4,2.0,241,273,24,34,null,4,5,2022,27990,22000),
  (21,'Nissan','Rogue','SV AWD','suv','gasoline','awd','cvt','1.5L Turbo I3',3,1.5,201,225,28,35,null,4,5,2022,23990,29000),
  (22,'Chevrolet','Tahoe','Premier','suv','gasoline','4wd','automatic','6.2L V8',8,6.2,420,460,15,20,null,4,7,2021,58990,40000),
  (23,'Toyota','Sienna','XLE AWD','minivan','hybrid','awd','cvt','2.5L I4 Hybrid',4,2.5,245,null,35,36,null,4,8,2022,42990,26000),
  (24,'Mazda','MX-5 Miata','Grand Touring','convertible','gasoline','rwd','manual','2.0L I4',4,2.0,181,151,26,34,null,2,2,2021,27490,14000),
  (25,'Land Rover','Range Rover Sport','HSE Dynamic','suv','gasoline','awd','automatic','3.0L Turbo I6 MHEV',6,3.0,355,365,19,24,null,4,5,2021,62990,30000),
  (26,'Ford','Mustang Mach-E','Premium AWD','suv','electric','awd','automatic','Dual Motor Electric',0,null,346,428,null,null,270,4,5,2022,36990,21000);

insert into public.vehicles (
  dealer_id, stock_number, vin, make_id, model_id, year, trim, condition, body_type, mileage,
  price_cents, exterior_color, interior_color, fuel_type, drivetrain, transmission, engine,
  cylinders, displacement_l, horsepower, torque_lbft, mpg_city, mpg_highway, ev_range_mi,
  doors, seats, owners_count, accident_free, title_status, description, is_featured, specs
)
select
  case
    when g.i % 13 = 0 then '00000000-0000-4000-8000-000000000003'::uuid
    when g.i % 5 = 0 then '00000000-0000-4000-8000-000000000002'::uuid
    else '00000000-0000-4000-8000-000000000001'::uuid
  end,
  'CP' || lpad(g.i::text, 4, '0'),
  upper(substr(md5('seed-vin-' || g.i), 1, 17)),
  mk.id, md.id,
  s.base_year - k.k,
  s.trim,
  (case when g.i % 9 = 0 then 'certified' else 'used' end)::public.vehicle_condition,
  s.body::public.body_type,
  s.base_miles + k.k * 14000 + (g.i * 137) % 5000,
  ((round((s.base_price - k.k * 2500 - (g.i * 53) % 900) / 100.0) * 100 - 10) * 100)::bigint,
  (array['Alpine White','Jet Black','Midnight Blue','Lunar Silver','Graphite Gray','Crimson Red','Pearl White','Forest Green'])[1 + g.i % 8],
  (array['Black Leather','Ivory Leather','Gray Cloth','Cognac Leather'])[1 + g.i % 4],
  s.fuel::public.fuel_type, s.drive::public.drivetrain, s.trans::public.transmission, s.engine,
  s.cyl, s.displ, s.hp, s.tq, s.mpg_c, s.mpg_h, s.ev, s.doors, s.seats,
  1 + g.i % 3,
  g.i % 7 <> 0,
  (case when g.i % 23 = 0 then 'rebuilt' else 'clean' end)::public.title_status,
  format(
    'This %s %s %s %s comes with %s, %s and a %s. Well maintained, %s owner(s), and ready for a test drive.',
    s.base_year - k.k, s.make, s.model, s.trim, s.engine, upper(s.drive), s.trans,
    1 + g.i % 3
  ),
  g.i % 6 = 1,
  jsonb_build_object('warranty', case when g.i % 9 = 0 then 'Certified 12 months / 12,000 miles' end)
from generate_series(1, 60) as g(i)
cross join lateral (select (g.i - 1) / 26 as k) as k
join seed_specs s on s.n = ((g.i - 1) % 26) + 1
join public.makes mk on mk.name = s.make
join public.models md on md.make_id = mk.id and md.name = s.model;

-- Three placeholder photos per vehicle (files uploaded by `pnpm db:seed:images`).
insert into public.vehicle_images (vehicle_id, storage_path, position, width, height, alt)
select v.id, v.dealer_id || '/' || v.id || '/' || p.pos || '.jpg', p.pos, 1600, 1067,
       concat_ws(' ', v.year, mk.name, md.name, v.trim) || ' – ' || p.view
from public.vehicles v
join public.makes mk on mk.id = v.make_id
join public.models md on md.id = v.model_id
cross join (values (0, 'front three-quarter view'), (1, 'side profile'), (2, 'interior')) as p(pos, view);

insert into public.vehicle_features (vehicle_id, feature_id)
select v.id, f.id
from public.vehicles v
cross join public.features f
where (f.id + substr(v.stock_number, 3)::int) % 3 = 0;

-- Publish through the real publish gate (pending dealer's cars stay as drafts).
update public.vehicles v set status = x.status::public.listing_status
from (
  select id,
    case
      when dealer_id = '00000000-0000-4000-8000-000000000003' then 'draft'
      when substr(stock_number, 3)::int % 17 = 0 then 'draft'
      when substr(stock_number, 3)::int in (7, 19, 33) then 'reserved'
      when substr(stock_number, 3)::int in (11, 29, 47) then 'sold'
      else 'active'
    end as status
  from public.vehicles
) x
where v.id = x.id and x.status <> 'draft';

-- A few price drops so the "price drop" badge has data.
update public.vehicles set price_cents = price_cents - 100000
where status = 'active' and substr(stock_number, 3)::int % 4 = 0;
