import type { VehicleDetail } from '@cp/api';
import { describe, expect, it } from 'vitest';

import { serializeJsonLd, vehicleJsonLd } from './json-ld';

const vehicle = {
  id: 'v1',
  slug: '2021-bmw-x5-xdrive40i-abc',
  title: '2021 BMW X5 xDrive40i',
  status: 'reserved',
  condition: 'certified',
  year: 2021,
  trim: 'xDrive40i',
  mileage: 32410,
  price_cents: 4_599_050,
  vin: '5UXCR6C05L9B12345',
  stock_number: 'A123',
  exterior_color: 'Black',
  interior_color: null,
  body_type: 'suv',
  fuel_type: 'gasoline',
  drivetrain: 'awd',
  transmission: 'automatic',
  doors: 4,
  seats: null,
  description: 'One owner. <script>alert(1)</script>',
  make: { id: 1, name: 'BMW', slug: 'bmw' },
  model: { id: 2, name: 'X5', slug: 'x5' },
  images: [{ url: 'https://cdn.example/x5-0.jpg' }],
  dealer: {
    display_name: 'Car Platform Motors',
    phone_e164: '+13473700570',
    address_line1: '300 NJ-31',
    city: 'Flemington',
    state: 'NJ',
    postal_code: '08822',
  },
} as unknown as VehicleDetail;

describe('vehicleJsonLd', () => {
  const ld = vehicleJsonLd(vehicle, 'https://example.com/inventory/x5');

  it('describes the car with exact listing data', () => {
    expect(ld).toMatchObject({
      '@type': 'Car',
      name: '2021 BMW X5 xDrive40i',
      brand: { '@type': 'Brand', name: 'BMW' },
      model: 'X5',
      vehicleModelDate: '2021',
      itemCondition: 'https://schema.org/UsedCondition',
      vehicleIdentificationNumber: '5UXCR6C05L9B12345',
      mileageFromOdometer: { value: 32410, unitCode: 'SMI' },
      driveWheelConfiguration: 'All-wheel drive (AWD)',
      image: ['https://cdn.example/x5-0.jpg'],
    });
  });

  it('prices the offer exactly and maps availability', () => {
    expect(ld.offers).toMatchObject({
      '@type': 'Offer',
      price: '45990.50',
      priceCurrency: 'USD',
      availability: 'https://schema.org/LimitedAvailability',
      seller: { '@type': 'AutoDealer', address: { postalCode: '08822', addressCountry: 'US' } },
    });
  });

  it('omits fields the listing does not state', () => {
    expect(ld).not.toHaveProperty('vehicleInteriorColor');
    expect(ld).not.toHaveProperty('seatingCapacity');
  });

  it('serializes without a closable script tag', () => {
    const json = serializeJsonLd(ld);
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toEqual(ld);
  });
});
