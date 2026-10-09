-- Reference data for every environment: site settings, the vehicle catalog and the house
-- dealership (DG Auto). Idempotent and never overwrites existing rows, so admin edits survive.
-- Local: loaded before seed.sql on `pnpm db:reset`. Hosted: `pnpm db:remote:seed` (ask first).
-- Business hours are placeholders until the owner confirms them.

------------------------------------------------------------------------------
-- Site settings
------------------------------------------------------------------------------
insert into public.site_settings (
  id, brand_name, default_whatsapp_e164, default_phone_e164, business_hours, apr_by_tier
) values (
  1, 'DG Auto', '+13473700570', '+13473700570',
  '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"10:00-17:00","sun":null}',
  '{"excellent":650,"good":900,"fair":1350,"rebuilding":1900}'
)
on conflict (id) do nothing;

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
]) as t(name)
on conflict do nothing;

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
join public.makes m on m.name = v.make
on conflict do nothing;

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
) as f(name, cat)
on conflict do nothing;

------------------------------------------------------------------------------
-- House dealership
------------------------------------------------------------------------------
insert into public.dealers (
  id, slug, display_name, legal_name, status, is_house, phone_e164, whatsapp_e164, email,
  address_line1, city, state, postal_code, lat, lng, description, business_hours, approved_at
) values
  ('00000000-0000-4000-8000-000000000001', 'dg-auto', 'DG Auto', null,
   'approved', true, '+13473700570', '+13473700570', null,
   '300 NJ-31', 'Flemington', 'NJ', '08822', 40.5123, -74.8593,
   'Our dealership in Flemington, New Jersey.',
   '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"10:00-17:00","sun":null}',
   now())
on conflict (id) do nothing;

insert into public.dealer_private (dealer_id) values ('00000000-0000-4000-8000-000000000001')
on conflict (dealer_id) do nothing;
