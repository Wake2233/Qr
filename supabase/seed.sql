-- Local development seed. Runs on `pnpm db:reset` (as postgres, triggers enabled).
-- Users and dealer memberships are created by `pnpm db:seed:users`; photos by `pnpm db:seed:images`.

------------------------------------------------------------------------------
-- Site settings (placeholders until the business confirms brand/hours)
------------------------------------------------------------------------------
insert into public.site_settings (
  id, brand_name, default_whatsapp_e164, default_phone_e164, business_hours, apr_by_tier
) values (
  1, 'Car Platform', '+13473700570', '+13473700570',
  '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"10:00-17:00","sun":null}',
  '{"excellent":650,"good":900,"fair":1350,"rebuilding":1900}'
);

------------------------------------------------------------------------------
-- Catalog
------------------------------------------------------------------------------
insert into public.makes (name, slug)
select name, lower(regexp_replace(name, '[^A-Za-z0-9]+', '-', 'g'))
from unnest(array[
  'Acura','Audi','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ford','Genesis','GMC',
  'Honda','Hyundai','Infiniti','Jaguar','Jeep','Kia','Land Rover','Lexus','Lincoln','Mazda',
  'Mercedes-Benz','Mini','Mitsubishi','Nissan','Porsche','Ram','Subaru','Tesla','Toyota',
  'Volkswagen','Volvo'
]) as t(name);

insert into public.models (make_id, name, slug, default_body_type)
select m.id, v.model, trim(both '-' from lower(regexp_replace(v.model, '[^A-Za-z0-9]+', '-', 'g'))), v.body::public.body_type
from (values
  ('Acura','MDX','suv'),('Acura','RDX','suv'),('Acura','TLX','sedan'),('Acura','Integra','hatchback'),
  ('Audi','A4','sedan'),('Audi','A6','sedan'),('Audi','Q3','suv'),('Audi','Q5','suv'),('Audi','Q7','suv'),('Audi','e-tron GT','sedan'),
  ('BMW','3 Series','sedan'),('BMW','5 Series','sedan'),('BMW','X1','suv'),('BMW','X3','suv'),('BMW','X5','suv'),('BMW','i4','sedan'),('BMW','M3','sedan'),
  ('Buick','Enclave','suv'),('Buick','Encore GX','suv'),('Buick','Envision','suv'),
  ('Cadillac','Escalade','suv'),('Cadillac','XT5','suv'),('Cadillac','CT5','sedan'),('Cadillac','Lyriq','suv'),
  ('Chevrolet','Silverado 1500','pickup'),('Chevrolet','Colorado','pickup'),('Chevrolet','Equinox','suv'),('Chevrolet','Traverse','suv'),
  ('Chevrolet','Tahoe','suv'),('Chevrolet','Malibu','sedan'),('Chevrolet','Corvette','coupe'),('Chevrolet','Bolt EV','hatchback'),
  ('Chrysler','Pacifica','minivan'),('Chrysler','300','sedan'),
  ('Dodge','Charger','sedan'),('Dodge','Challenger','coupe'),('Dodge','Durango','suv'),('Dodge','Hornet','suv'),
  ('Ford','F-150','pickup'),('Ford','Ranger','pickup'),('Ford','Maverick','pickup'),('Ford','Explorer','suv'),('Ford','Escape','suv'),
  ('Ford','Edge','suv'),('Ford','Expedition','suv'),('Ford','Bronco','suv'),('Ford','Mustang','coupe'),('Ford','Mustang Mach-E','suv'),
  ('Genesis','G70','sedan'),('Genesis','GV70','suv'),('Genesis','GV80','suv'),
  ('GMC','Sierra 1500','pickup'),('GMC','Yukon','suv'),('GMC','Acadia','suv'),('GMC','Terrain','suv'),
  ('Honda','Civic','sedan'),('Honda','Accord','sedan'),('Honda','CR-V','suv'),('Honda','HR-V','suv'),('Honda','Pilot','suv'),
  ('Honda','Passport','suv'),('Honda','Odyssey','minivan'),
  ('Hyundai','Elantra','sedan'),('Hyundai','Sonata','sedan'),('Hyundai','Kona','suv'),('Hyundai','Tucson','suv'),
  ('Hyundai','Santa Fe','suv'),('Hyundai','Palisade','suv'),('Hyundai','Ioniq 5','suv'),
  ('Infiniti','Q50','sedan'),('Infiniti','QX50','suv'),('Infiniti','QX60','suv'),
  ('Jaguar','XF','sedan'),('Jaguar','E-Pace','suv'),('Jaguar','F-Pace','suv'),
  ('Jeep','Wrangler','suv'),('Jeep','Grand Cherokee','suv'),('Jeep','Cherokee','suv'),('Jeep','Compass','suv'),('Jeep','Gladiator','pickup'),
  ('Kia','Forte','sedan'),('Kia','K5','sedan'),('Kia','Soul','hatchback'),('Kia','Sportage','suv'),('Kia','Sorento','suv'),
  ('Kia','Telluride','suv'),('Kia','EV6','suv'),
  ('Land Rover','Range Rover','suv'),('Land Rover','Range Rover Sport','suv'),('Land Rover','Defender','suv'),('Land Rover','Discovery Sport','suv'),
  ('Lexus','IS','sedan'),('Lexus','ES','sedan'),('Lexus','NX','suv'),('Lexus','RX','suv'),('Lexus','GX','suv'),
  ('Lincoln','Corsair','suv'),('Lincoln','Nautilus','suv'),('Lincoln','Aviator','suv'),('Lincoln','Navigator','suv'),
  ('Mazda','Mazda3','sedan'),('Mazda','CX-5','suv'),('Mazda','CX-50','suv'),('Mazda','CX-90','suv'),('Mazda','MX-5 Miata','convertible'),
  ('Mercedes-Benz','C-Class','sedan'),('Mercedes-Benz','E-Class','sedan'),('Mercedes-Benz','S-Class','sedan'),('Mercedes-Benz','GLA','suv'),
  ('Mercedes-Benz','GLC','suv'),('Mercedes-Benz','GLE','suv'),('Mercedes-Benz','EQE','sedan'),
  ('Mini','Cooper','hatchback'),('Mini','Countryman','suv'),
  ('Mitsubishi','Outlander','suv'),('Mitsubishi','Eclipse Cross','suv'),
  ('Nissan','Sentra','sedan'),('Nissan','Altima','sedan'),('Nissan','Rogue','suv'),('Nissan','Murano','suv'),
  ('Nissan','Pathfinder','suv'),('Nissan','Frontier','pickup'),('Nissan','Leaf','hatchback'),
  ('Porsche','911','coupe'),('Porsche','Macan','suv'),('Porsche','Cayenne','suv'),('Porsche','Taycan','sedan'),
  ('Ram','1500','pickup'),('Ram','2500','pickup'),
  ('Subaru','Crosstrek','suv'),('Subaru','Forester','suv'),('Subaru','Outback','wagon'),('Subaru','Ascent','suv'),('Subaru','WRX','sedan'),
  ('Tesla','Model 3','sedan'),('Tesla','Model Y','suv'),('Tesla','Model S','sedan'),('Tesla','Model X','suv'),
  ('Toyota','Corolla','sedan'),('Toyota','Camry','sedan'),('Toyota','Prius','hatchback'),('Toyota','RAV4','suv'),
  ('Toyota','Highlander','suv'),('Toyota','Grand Highlander','suv'),('Toyota','4Runner','suv'),('Toyota','Sienna','minivan'),
  ('Toyota','Tacoma','pickup'),('Toyota','Tundra','pickup'),
  ('Volkswagen','Jetta','sedan'),('Volkswagen','Golf GTI','hatchback'),('Volkswagen','Tiguan','suv'),('Volkswagen','Atlas','suv'),('Volkswagen','ID.4','suv'),
  ('Volvo','S60','sedan'),('Volvo','XC40','suv'),('Volvo','XC60','suv'),('Volvo','XC90','suv')
) as v(make, model, body)
join public.makes m on m.name = v.make;

insert into public.features (name, slug, category)
select f.name, trim(both '-' from lower(regexp_replace(f.name, '[^A-Za-z0-9]+', '-', 'g'))), f.cat::public.feature_category
from (values
  ('Adaptive Cruise Control','safety'),('Blind Spot Monitoring','safety'),('Lane Keep Assist','safety'),
  ('Automatic Emergency Braking','safety'),('Rear Cross-Traffic Alert','safety'),('Backup Camera','safety'),
  ('360-Degree Camera','safety'),('Parking Sensors','safety'),('Driver Attention Monitor','safety'),('Traction Control','safety'),
  ('Heated Seats','comfort'),('Ventilated Seats','comfort'),('Heated Steering Wheel','comfort'),('Dual-Zone Climate Control','comfort'),
  ('Tri-Zone Climate Control','comfort'),('Power Liftgate','comfort'),('Keyless Entry','comfort'),('Push-Button Start','comfort'),
  ('Remote Start','comfort'),('Memory Seats','comfort'),('Power Driver Seat','comfort'),('Heated Rear Seats','comfort'),
  ('Apple CarPlay','technology'),('Android Auto','technology'),('Navigation System','technology'),('Bluetooth','technology'),
  ('Wireless Charging','technology'),('Premium Sound System','technology'),('Head-Up Display','technology'),
  ('Digital Instrument Cluster','technology'),('Wi-Fi Hotspot','technology'),('USB-C Ports','technology'),
  ('Satellite Radio','technology'),('Rear Entertainment System','technology'),
  ('Sunroof','exterior'),('Panoramic Moonroof','exterior'),('LED Headlights','exterior'),('Fog Lights','exterior'),
  ('Roof Rails','exterior'),('Tow Hitch','exterior'),('Alloy Wheels','exterior'),('Running Boards','exterior'),
  ('Bed Liner','exterior'),('Power Folding Mirrors','exterior'),
  ('Leather Seats','interior'),('Third-Row Seating','interior'),('Captain''s Chairs','interior'),('Ambient Lighting','interior'),
  ('Folding Rear Seats','interior'),('Auto-Dimming Mirror','interior'),('Cargo Cover','interior'),
  ('All-Wheel Drive','performance'),('Turbocharged Engine','performance'),('Sport Mode','performance'),
  ('Paddle Shifters','performance'),('Limited-Slip Differential','performance'),('Adaptive Suspension','performance'),
  ('Off-Road Package','performance'),('Towing Package','performance'),('Performance Brakes','performance')
) as f(name, cat);

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
-- Dealers: the house dealership + two fictional sub-dealers (approved, pending)
------------------------------------------------------------------------------
insert into public.dealers (
  id, slug, display_name, legal_name, status, is_house, phone_e164, whatsapp_e164, email,
  address_line1, city, state, postal_code, lat, lng, description, business_hours, approved_at
) values
  ('00000000-0000-4000-8000-000000000001', 'car-platform-motors', 'Car Platform Motors', null,
   'approved', true, '+13473700570', '+13473700570', null,
   '300 NJ-31', 'Flemington', 'NJ', '08822', 40.5123, -74.8593,
   'Our flagship dealership in Flemington, New Jersey.',
   '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"10:00-17:00","sun":null}',
   now()),
  ('00000000-0000-4000-8000-000000000002', 'garden-state-auto-group', 'Garden State Auto Group', 'Garden State Auto Group LLC',
   'approved', false, '+17325550142', '+17325550142', 'sales@gardenstate.example',
   '1200 US-1', 'Edison', 'NJ', '08817', 40.5187, -74.4121,
   'Fictional demo sub-dealer.', '{}', now()),
  ('00000000-0000-4000-8000-000000000003', 'hudson-valley-cars', 'Hudson Valley Cars', 'Hudson Valley Cars Inc.',
   'pending', false, '+18455550199', '+18455550199', 'hello@hudsonvalley.example',
   '45 Route 17K', 'Newburgh', 'NY', '12550', 41.5034, -74.0104,
   'Fictional demo dealer awaiting approval.', '{}', null);

insert into public.dealer_private (dealer_id, license_number) values
  ('00000000-0000-4000-8000-000000000001', 'NJ-DLR-PLACEHOLDER'),
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
