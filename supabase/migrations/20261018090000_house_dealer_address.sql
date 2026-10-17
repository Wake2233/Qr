-- The house dealership moved: 26 New Dorp Ln, Staten Island, NY 10306.
-- Only replaces the original seeded address, never an address edited in the console.
update public.dealers
set address_line1 = '26 New Dorp Ln',
    city = 'Staten Island',
    state = 'NY',
    postal_code = '10306',
    lat = null,
    lng = null,
    description = case
      when description = 'Our dealership in Flemington, New Jersey.'
        then 'Our dealership in Staten Island, New York.'
      else description
    end
where id = '00000000-0000-4000-8000-000000000001'
  and address_line1 = '300 NJ-31';
