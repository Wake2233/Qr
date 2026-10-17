-- Reference data for every environment: site settings, the vehicle catalog and the house
-- dealership (DG Auto). Idempotent and never overwrites existing rows, so admin edits survive.
-- Local: loaded before seed.sql on `pnpm db:reset`. Hosted: `pnpm db:remote:seed` (ask first).
-- Business hours are placeholders until the owner confirms them.

------------------------------------------------------------------------------
-- Site settings
------------------------------------------------------------------------------
insert into public.site_settings (
  id, brand_name, default_whatsapp_e164, default_phone_e164, business_hours
) values (
  1, 'DG Auto', '+13473700570', '+13473700570',
  '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"10:00-17:00","sun":null}'
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
  -- Acura
  ('Acura','ILX','sedan'),('Acura','TLX','sedan'),('Acura','TL','sedan'),('Acura','TSX','sedan'),
  ('Acura','RLX','sedan'),('Acura','Integra','hatchback'),('Acura','RDX','suv'),
  ('Acura','MDX','suv'),('Acura','ZDX','suv'),('Acura','ADX','suv'),('Acura','NSX','coupe'),
  -- Audi
  ('Audi','A3','sedan'),('Audi','A4','sedan'),('Audi','A5','coupe'),('Audi','A6','sedan'),
  ('Audi','A7','sedan'),('Audi','A8','sedan'),('Audi','A4 allroad','wagon'),
  ('Audi','A6 allroad','wagon'),('Audi','Q3','suv'),('Audi','Q4 e-tron','suv'),('Audi','Q5','suv'),
  ('Audi','Q5 Sportback','suv'),('Audi','Q6 e-tron','suv'),('Audi','Q7','suv'),('Audi','Q8','suv'),
  ('Audi','e-tron','suv'),('Audi','Q8 e-tron','suv'),('Audi','e-tron GT','sedan'),
  ('Audi','TT','coupe'),('Audi','R8','coupe'),
  -- BMW
  ('BMW','2 Series','coupe'),('BMW','3 Series','sedan'),('BMW','4 Series','coupe'),
  ('BMW','5 Series','sedan'),('BMW','6 Series','coupe'),('BMW','7 Series','sedan'),
  ('BMW','8 Series','coupe'),('BMW','M2','coupe'),('BMW','M3','sedan'),('BMW','M4','coupe'),
  ('BMW','M5','sedan'),('BMW','X1','suv'),('BMW','X2','suv'),('BMW','X3','suv'),('BMW','X4','suv'),
  ('BMW','X5','suv'),('BMW','X6','suv'),('BMW','X7','suv'),('BMW','XM','suv'),
  ('BMW','i3','hatchback'),('BMW','i4','sedan'),('BMW','i5','sedan'),('BMW','i7','sedan'),
  ('BMW','iX','suv'),('BMW','Z4','convertible'),
  -- Buick
  ('Buick','Enclave','suv'),('Buick','Encore','suv'),('Buick','Encore GX','suv'),
  ('Buick','Envision','suv'),('Buick','Envista','suv'),('Buick','Regal','sedan'),
  ('Buick','LaCrosse','sedan'),('Buick','Verano','sedan'),('Buick','Lucerne','sedan'),
  ('Buick','Cascada','convertible'),
  -- Cadillac
  ('Cadillac','CT4','sedan'),('Cadillac','CT5','sedan'),('Cadillac','CT6','sedan'),
  ('Cadillac','ATS','sedan'),('Cadillac','CTS','sedan'),('Cadillac','XTS','sedan'),
  ('Cadillac','XT4','suv'),('Cadillac','XT5','suv'),('Cadillac','XT6','suv'),
  ('Cadillac','SRX','suv'),('Cadillac','Escalade','suv'),('Cadillac','Escalade ESV','suv'),
  ('Cadillac','Lyriq','suv'),('Cadillac','Optiq','suv'),('Cadillac','Vistiq','suv'),
  -- Chevrolet
  ('Chevrolet','Silverado 1500','pickup'),('Chevrolet','Silverado 2500HD','pickup'),
  ('Chevrolet','Silverado 3500HD','pickup'),('Chevrolet','Silverado EV','pickup'),
  ('Chevrolet','Colorado','pickup'),('Chevrolet','Equinox','suv'),('Chevrolet','Equinox EV','suv'),
  ('Chevrolet','Blazer','suv'),('Chevrolet','Blazer EV','suv'),('Chevrolet','Traverse','suv'),
  ('Chevrolet','Tahoe','suv'),('Chevrolet','Suburban','suv'),('Chevrolet','Trailblazer','suv'),
  ('Chevrolet','Trax','suv'),('Chevrolet','Malibu','sedan'),('Chevrolet','Impala','sedan'),
  ('Chevrolet','Cruze','sedan'),('Chevrolet','Sonic','hatchback'),
  ('Chevrolet','Spark','hatchback'),('Chevrolet','Camaro','coupe'),
  ('Chevrolet','Corvette','coupe'),('Chevrolet','Bolt EV','hatchback'),
  ('Chevrolet','Bolt EUV','suv'),('Chevrolet','Volt','hatchback'),('Chevrolet','Express','van'),
  -- Chrysler
  ('Chrysler','300','sedan'),('Chrysler','200','sedan'),('Chrysler','Pacifica','minivan'),
  ('Chrysler','Voyager','minivan'),('Chrysler','Town & Country','minivan'),
  -- Dodge
  ('Dodge','Charger','sedan'),('Dodge','Challenger','coupe'),('Dodge','Durango','suv'),
  ('Dodge','Hornet','suv'),('Dodge','Journey','suv'),('Dodge','Grand Caravan','minivan'),
  ('Dodge','Dart','sedan'),('Dodge','Avenger','sedan'),('Dodge','Viper','coupe'),
  -- Ford
  ('Ford','F-150','pickup'),('Ford','F-150 Lightning','pickup'),
  ('Ford','F-250 Super Duty','pickup'),('Ford','F-350 Super Duty','pickup'),
  ('Ford','Ranger','pickup'),('Ford','Maverick','pickup'),('Ford','Explorer','suv'),
  ('Ford','Escape','suv'),('Ford','Edge','suv'),('Ford','Expedition','suv'),
  ('Ford','Bronco','suv'),('Ford','Bronco Sport','suv'),('Ford','EcoSport','suv'),
  ('Ford','Flex','suv'),('Ford','Mustang Mach-E','suv'),('Ford','Mustang','coupe'),
  ('Ford','GT','coupe'),('Ford','Fusion','sedan'),('Ford','Taurus','sedan'),
  ('Ford','Focus','hatchback'),('Ford','Fiesta','hatchback'),('Ford','C-Max','hatchback'),
  ('Ford','Transit','van'),('Ford','Transit Connect','van'),('Ford','E-Series','van'),
  -- Genesis
  ('Genesis','G70','sedan'),('Genesis','G80','sedan'),('Genesis','Electrified G80','sedan'),
  ('Genesis','G90','sedan'),('Genesis','GV60','suv'),('Genesis','GV70','suv'),
  ('Genesis','Electrified GV70','suv'),('Genesis','GV80','suv'),('Genesis','GV80 Coupe','suv'),
  -- GMC
  ('GMC','Sierra 1500','pickup'),('GMC','Sierra 2500HD','pickup'),('GMC','Sierra 3500HD','pickup'),
  ('GMC','Sierra EV','pickup'),('GMC','Canyon','pickup'),('GMC','Hummer EV','pickup'),
  ('GMC','Hummer EV SUV','suv'),('GMC','Yukon','suv'),('GMC','Yukon XL','suv'),
  ('GMC','Acadia','suv'),('GMC','Terrain','suv'),('GMC','Envoy','suv'),('GMC','Savana','van'),
  -- Honda
  ('Honda','Civic','sedan'),('Honda','Civic Hatchback','hatchback'),
  ('Honda','Civic Type R','hatchback'),('Honda','Accord','sedan'),('Honda','Insight','sedan'),
  ('Honda','Clarity','sedan'),('Honda','Fit','hatchback'),('Honda','CR-Z','hatchback'),
  ('Honda','HR-V','suv'),('Honda','CR-V','suv'),('Honda','Passport','suv'),('Honda','Pilot','suv'),
  ('Honda','Prologue','suv'),('Honda','Element','suv'),('Honda','Crosstour','hatchback'),
  ('Honda','Odyssey','minivan'),('Honda','Ridgeline','pickup'),
  -- Hyundai
  ('Hyundai','Accent','sedan'),('Hyundai','Elantra','sedan'),('Hyundai','Sonata','sedan'),
  ('Hyundai','Azera','sedan'),('Hyundai','Ioniq 6','sedan'),('Hyundai','Ioniq','hatchback'),
  ('Hyundai','Elantra GT','hatchback'),('Hyundai','Veloster','hatchback'),
  ('Hyundai','Genesis Coupe','coupe'),('Hyundai','Venue','suv'),('Hyundai','Kona','suv'),
  ('Hyundai','Kona Electric','suv'),('Hyundai','Tucson','suv'),('Hyundai','Santa Fe','suv'),
  ('Hyundai','Santa Fe Sport','suv'),('Hyundai','Palisade','suv'),('Hyundai','Ioniq 5','suv'),
  ('Hyundai','Ioniq 9','suv'),('Hyundai','Veracruz','suv'),('Hyundai','Santa Cruz','pickup'),
  -- Infiniti
  ('Infiniti','Q50','sedan'),('Infiniti','Q60','coupe'),('Infiniti','Q70','sedan'),
  ('Infiniti','G37','sedan'),('Infiniti','QX30','suv'),('Infiniti','QX50','suv'),
  ('Infiniti','QX55','suv'),('Infiniti','QX60','suv'),('Infiniti','QX70','suv'),
  ('Infiniti','QX80','suv'),
  -- Jaguar
  ('Jaguar','XE','sedan'),('Jaguar','XF','sedan'),('Jaguar','XJ','sedan'),
  ('Jaguar','F-Type','coupe'),('Jaguar','E-Pace','suv'),('Jaguar','F-Pace','suv'),
  ('Jaguar','I-Pace','suv'),
  -- Jeep
  ('Jeep','Wrangler','suv'),('Jeep','Grand Cherokee','suv'),('Jeep','Grand Cherokee L','suv'),
  ('Jeep','Cherokee','suv'),('Jeep','Compass','suv'),('Jeep','Renegade','suv'),
  ('Jeep','Patriot','suv'),('Jeep','Liberty','suv'),('Jeep','Wagoneer','suv'),
  ('Jeep','Grand Wagoneer','suv'),('Jeep','Wagoneer S','suv'),('Jeep','Gladiator','pickup'),
  -- Kia
  ('Kia','Rio','sedan'),('Kia','Forte','sedan'),('Kia','K4','sedan'),('Kia','K5','sedan'),
  ('Kia','Optima','sedan'),('Kia','Cadenza','sedan'),('Kia','Stinger','sedan'),
  ('Kia','K900','sedan'),('Kia','Soul','hatchback'),('Kia','Niro','suv'),('Kia','Niro EV','suv'),
  ('Kia','Seltos','suv'),('Kia','Sportage','suv'),('Kia','Sorento','suv'),
  ('Kia','Telluride','suv'),('Kia','Borrego','suv'),('Kia','EV6','suv'),('Kia','EV9','suv'),
  ('Kia','Sedona','minivan'),('Kia','Carnival','minivan'),
  -- Land Rover
  ('Land Rover','Range Rover','suv'),('Land Rover','Range Rover Sport','suv'),
  ('Land Rover','Range Rover Velar','suv'),('Land Rover','Range Rover Evoque','suv'),
  ('Land Rover','Defender','suv'),('Land Rover','Discovery','suv'),
  ('Land Rover','Discovery Sport','suv'),('Land Rover','LR4','suv'),('Land Rover','LR2','suv'),
  -- Lexus
  ('Lexus','IS','sedan'),('Lexus','ES','sedan'),('Lexus','GS','sedan'),('Lexus','LS','sedan'),
  ('Lexus','HS','sedan'),('Lexus','RC','coupe'),('Lexus','LC','coupe'),('Lexus','CT','hatchback'),
  ('Lexus','UX','suv'),('Lexus','NX','suv'),('Lexus','RX','suv'),('Lexus','RZ','suv'),
  ('Lexus','TX','suv'),('Lexus','GX','suv'),('Lexus','LX','suv'),
  -- Lincoln
  ('Lincoln','MKZ','sedan'),('Lincoln','MKS','sedan'),('Lincoln','Continental','sedan'),
  ('Lincoln','MKC','suv'),('Lincoln','Corsair','suv'),('Lincoln','MKX','suv'),
  ('Lincoln','Nautilus','suv'),('Lincoln','MKT','suv'),('Lincoln','Aviator','suv'),
  ('Lincoln','Navigator','suv'),
  -- Mazda
  ('Mazda','Mazda3','sedan'),('Mazda','Mazda3 Hatchback','hatchback'),('Mazda','Mazda6','sedan'),
  ('Mazda','Mazda2','hatchback'),('Mazda','MX-5 Miata','convertible'),('Mazda','RX-8','coupe'),
  ('Mazda','MX-30','suv'),('Mazda','CX-3','suv'),('Mazda','CX-30','suv'),('Mazda','CX-5','suv'),
  ('Mazda','CX-50','suv'),('Mazda','CX-70','suv'),('Mazda','CX-9','suv'),('Mazda','CX-90','suv'),
  -- Mercedes-Benz
  ('Mercedes-Benz','A-Class','sedan'),('Mercedes-Benz','C-Class','sedan'),
  ('Mercedes-Benz','E-Class','sedan'),('Mercedes-Benz','S-Class','sedan'),
  ('Mercedes-Benz','CLA','sedan'),('Mercedes-Benz','CLS','sedan'),('Mercedes-Benz','EQE','sedan'),
  ('Mercedes-Benz','EQS','sedan'),('Mercedes-Benz','GLA','suv'),('Mercedes-Benz','GLB','suv'),
  ('Mercedes-Benz','GLC','suv'),('Mercedes-Benz','GLC Coupe','suv'),('Mercedes-Benz','GLE','suv'),
  ('Mercedes-Benz','GLE Coupe','suv'),('Mercedes-Benz','GLS','suv'),
  ('Mercedes-Benz','G-Class','suv'),('Mercedes-Benz','M-Class','suv'),
  ('Mercedes-Benz','GLK','suv'),('Mercedes-Benz','EQB','suv'),('Mercedes-Benz','EQE SUV','suv'),
  ('Mercedes-Benz','EQS SUV','suv'),('Mercedes-Benz','SL','convertible'),
  ('Mercedes-Benz','AMG GT','coupe'),('Mercedes-Benz','Sprinter','van'),
  ('Mercedes-Benz','Metris','van'),
  -- Mini
  ('Mini','Cooper','hatchback'),('Mini','Cooper Convertible','convertible'),
  ('Mini','Clubman','wagon'),('Mini','Countryman','suv'),('Mini','Paceman','hatchback'),
  -- Mitsubishi
  ('Mitsubishi','Mirage','hatchback'),('Mitsubishi','Mirage G4','sedan'),
  ('Mitsubishi','Lancer','sedan'),('Mitsubishi','Outlander','suv'),
  ('Mitsubishi','Outlander PHEV','suv'),('Mitsubishi','Outlander Sport','suv'),
  ('Mitsubishi','Eclipse Cross','suv'),
  -- Nissan
  ('Nissan','Versa','sedan'),('Nissan','Sentra','sedan'),('Nissan','Altima','sedan'),
  ('Nissan','Maxima','sedan'),('Nissan','Versa Note','hatchback'),('Nissan','Leaf','hatchback'),
  ('Nissan','Juke','suv'),('Nissan','Kicks','suv'),('Nissan','Rogue','suv'),
  ('Nissan','Rogue Sport','suv'),('Nissan','Murano','suv'),('Nissan','Pathfinder','suv'),
  ('Nissan','Armada','suv'),('Nissan','Ariya','suv'),('Nissan','Xterra','suv'),
  ('Nissan','Frontier','pickup'),('Nissan','Titan','pickup'),('Nissan','370Z','coupe'),
  ('Nissan','Z','coupe'),('Nissan','GT-R','coupe'),('Nissan','NV200','van'),
  ('Nissan','Quest','minivan'),
  -- Porsche
  ('Porsche','911','coupe'),('Porsche','718 Boxster','convertible'),
  ('Porsche','718 Cayman','coupe'),('Porsche','Panamera','sedan'),('Porsche','Taycan','sedan'),
  ('Porsche','Macan','suv'),('Porsche','Macan Electric','suv'),('Porsche','Cayenne','suv'),
  ('Porsche','Cayenne Coupe','suv'),
  -- Ram
  ('Ram','1500','pickup'),('Ram','1500 Classic','pickup'),('Ram','2500','pickup'),
  ('Ram','3500','pickup'),('Ram','Dakota','pickup'),('Ram','ProMaster','van'),
  ('Ram','ProMaster City','van'),
  -- Subaru
  ('Subaru','Impreza','sedan'),('Subaru','Legacy','sedan'),('Subaru','WRX','sedan'),
  ('Subaru','BRZ','coupe'),('Subaru','Crosstrek','suv'),('Subaru','Forester','suv'),
  ('Subaru','Outback','wagon'),('Subaru','Ascent','suv'),('Subaru','Solterra','suv'),
  ('Subaru','Tribeca','suv'),
  -- Tesla
  ('Tesla','Model 3','sedan'),('Tesla','Model S','sedan'),('Tesla','Model X','suv'),
  ('Tesla','Model Y','suv'),('Tesla','Cybertruck','pickup'),
  -- Toyota
  ('Toyota','Corolla','sedan'),('Toyota','Corolla Hatchback','hatchback'),
  ('Toyota','GR Corolla','hatchback'),('Toyota','Corolla Cross','suv'),('Toyota','Camry','sedan'),
  ('Toyota','Avalon','sedan'),('Toyota','Crown','sedan'),('Toyota','Mirai','sedan'),
  ('Toyota','Prius','hatchback'),('Toyota','Prius Prime','hatchback'),
  ('Toyota','Yaris','hatchback'),('Toyota','GR86','coupe'),('Toyota','GR Supra','coupe'),
  ('Toyota','C-HR','suv'),('Toyota','RAV4','suv'),('Toyota','Venza','suv'),
  ('Toyota','Highlander','suv'),('Toyota','Grand Highlander','suv'),('Toyota','4Runner','suv'),
  ('Toyota','Sequoia','suv'),('Toyota','Land Cruiser','suv'),('Toyota','bZ4X','suv'),
  ('Toyota','Sienna','minivan'),('Toyota','Tacoma','pickup'),('Toyota','Tundra','pickup'),
  -- Volkswagen
  ('Volkswagen','Jetta','sedan'),('Volkswagen','Passat','sedan'),('Volkswagen','Arteon','sedan'),
  ('Volkswagen','CC','sedan'),('Volkswagen','Golf','hatchback'),
  ('Volkswagen','Golf GTI','hatchback'),('Volkswagen','Golf R','hatchback'),
  ('Volkswagen','e-Golf','hatchback'),('Volkswagen','Beetle','hatchback'),
  ('Volkswagen','Eos','convertible'),('Volkswagen','Taos','suv'),('Volkswagen','Tiguan','suv'),
  ('Volkswagen','Atlas','suv'),('Volkswagen','Atlas Cross Sport','suv'),
  ('Volkswagen','ID.4','suv'),('Volkswagen','Touareg','suv'),('Volkswagen','ID. Buzz','minivan'),
  ('Volkswagen','Routan','minivan'),
  -- Volvo
  ('Volvo','S60','sedan'),('Volvo','S90','sedan'),('Volvo','S80','sedan'),('Volvo','V60','wagon'),
  ('Volvo','V60 Cross Country','wagon'),('Volvo','V90','wagon'),('Volvo','XC40','suv'),
  ('Volvo','C40 Recharge','suv'),('Volvo','XC60','suv'),('Volvo','XC90','suv'),
  ('Volvo','EX30','suv'),('Volvo','EX90','suv')
) as v(make, model, body)
join public.makes m on m.name = v.make
on conflict do nothing;

insert into public.features (name, slug, category)
select f.name,
  coalesce(f.slug, trim(both '-' from lower(regexp_replace(f.name, '[^A-Za-z0-9]+', '-', 'g')))),
  f.cat::public.feature_category
from (values
  ('Adaptive Cruise Control (DISTRONIC, ACC)','safety','adaptive-cruise-control'),('Blind Spot Monitoring','safety',null),('Lane Keep Assist','safety',null),
  ('Automatic Emergency Braking','safety',null),('Rear Cross-Traffic Alert','safety',null),('Backup Camera','safety',null),
  ('360-Degree Camera','safety',null),('Parking Sensors','safety',null),('Driver Attention Monitor','safety',null),('Traction Control','safety',null),
  ('Heated Seats','comfort',null),('Ventilated Seats','comfort',null),('Heated Steering Wheel','comfort',null),('Dual-Zone Climate Control','comfort',null),
  ('Tri-Zone Climate Control','comfort',null),('Power Liftgate','comfort',null),('Keyless Entry','comfort',null),('Push-Button Start','comfort',null),
  ('Remote Start','comfort',null),('Memory Seats','comfort',null),('Power Driver Seat','comfort',null),('Heated Rear Seats','comfort',null),
  ('Apple CarPlay','technology',null),('Android Auto','technology',null),('Navigation System','technology',null),('Bluetooth','technology',null),
  ('Wireless Charging','technology',null),('Premium Sound System','technology',null),('Head-Up Display','technology',null),
  ('Digital Instrument Cluster','technology',null),('Wi-Fi Hotspot','technology',null),('USB-C Ports','technology',null),
  ('Satellite Radio','technology',null),('Rear Entertainment System','technology',null),
  ('Sunroof / Moonroof','exterior','sunroof'),('Panoramic Sunroof / Moonroof','exterior','panoramic-moonroof'),('LED Headlights','exterior',null),('Fog Lights','exterior',null),
  ('Roof Rails','exterior',null),('Tow Hitch','exterior',null),('Alloy Wheels','exterior',null),('Running Boards','exterior',null),
  ('Bed Liner','exterior',null),('Power Folding Mirrors','exterior',null),
  ('Leather Seats','interior',null),('Third-Row Seating','interior',null),('Captain''s Chairs','interior',null),('Ambient Lighting','interior',null),
  ('Folding Rear Seats','interior',null),('Auto-Dimming Mirror','interior',null),('Cargo Cover','interior',null),
  ('All-Wheel Drive','performance',null),('Turbocharged Engine','performance',null),('Sport Mode','performance',null),
  ('Paddle Shifters','performance',null),('Limited-Slip Differential','performance',null),('Adaptive Suspension','performance',null),
  ('Off-Road Package','performance',null),('Towing Package','performance',null),('Performance Brakes','performance',null),
  ('Lane Centering Assist','safety',null),('Highway Driving Assist','safety',null),
  ('Forward Collision Warning','safety',null),('Pedestrian Detection','safety',null),
  ('Traffic Sign Recognition','safety',null),('Rear Automatic Braking','safety',null),
  ('Self-Parking (Park Assist)','safety',null),('Night Vision','safety',null),
  ('Safe Exit Assist','safety',null),('Hill Descent Control','safety',null),
  ('Tire Pressure Monitoring','safety',null),
  ('Massage Seats','comfort',null),('Ventilated Rear Seats','comfort',null),
  ('Four-Zone Climate Control','comfort',null),('Heated Windshield','comfort',null),
  ('Soft-Close Doors','comfort',null),('Hands-Free Liftgate','comfort',null),
  ('Power Sliding Doors','comfort',null),('Rear Sunshades','comfort',null),
  ('Rain-Sensing Wipers','comfort',null),('Cooled Glovebox','comfort',null),
  ('Wireless Apple CarPlay','technology',null),('Wireless Android Auto','technology',null),
  ('Digital Key','technology',null),('Large Touchscreen','technology',null),
  ('Voice Control','technology',null),('Built-In Dash Cam','technology',null),
  ('Adaptive Headlights','exterior',null),('Auto High Beams','exterior',null),
  ('Heated Mirrors','exterior',null),('Privacy Glass','exterior',null),
  ('Power Tonneau Cover','exterior',null),
  ('Leatherette Seats','interior',null),('Power Rear Seats','interior',null),
  ('Rear Captain''s Chairs','interior',null),
  ('Four-Wheel Drive','performance',null),('Air Suspension','performance',null),
  ('Rear-Wheel Steering','performance',null),('Sport Exhaust','performance',null),
  ('Launch Control','performance',null),('Trailer Assist','performance',null),
  ('Locking Differentials','performance',null),('Skid Plates','performance',null)
) as f(name, cat, slug)
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
   '26 New Dorp Ln', 'Staten Island', 'NY', '10306', null, null,
   'Our dealership in Staten Island, New York.',
   '{"mon":"09:00-19:00","tue":"09:00-19:00","wed":"09:00-19:00","thu":"09:00-19:00","fri":"09:00-19:00","sat":"10:00-17:00","sun":null}',
   now())
on conflict (id) do nothing;

insert into public.dealer_private (dealer_id) values ('00000000-0000-4000-8000-000000000001')
on conflict (dealer_id) do nothing;
