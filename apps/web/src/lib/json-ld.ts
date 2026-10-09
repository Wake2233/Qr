import type { VehicleDetail } from '@cp/api';
import { bodyTypeLabels, drivetrainLabels, fuelTypeLabels, transmissionLabels } from '@cp/core';

const CONDITION = {
  new: 'https://schema.org/NewCondition',
  used: 'https://schema.org/UsedCondition',
  certified: 'https://schema.org/UsedCondition',
} as const;

const AVAILABILITY = {
  active: 'https://schema.org/InStock',
  reserved: 'https://schema.org/LimitedAvailability',
  sold: 'https://schema.org/SoldOut',
} as const;

type JsonLd = Record<string, unknown>;

/** Drops null/undefined so the markup only claims what the listing actually states. */
function compact(value: JsonLd): JsonLd {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null && v !== undefined));
}

/** schema.org `Car` + `Offer` for a VDP. Prices are exact (cents → dollars, 2 decimals). */
export function vehicleJsonLd(vehicle: VehicleDetail, url: string): JsonLd {
  const dealer = vehicle.dealer;
  const availability =
    vehicle.status in AVAILABILITY
      ? AVAILABILITY[vehicle.status as keyof typeof AVAILABILITY]
      : undefined;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: vehicle.title,
    url,
    image: vehicle.images.map((image) => image.url),
    description: vehicle.description,
    brand: { '@type': 'Brand', name: vehicle.make.name },
    model: vehicle.model.name,
    vehicleModelDate: String(vehicle.year),
    vehicleConfiguration: vehicle.trim,
    itemCondition: CONDITION[vehicle.condition],
    vehicleIdentificationNumber: vehicle.vin,
    sku: vehicle.stock_number,
    mileageFromOdometer:
      vehicle.mileage === null
        ? null
        : { '@type': 'QuantitativeValue', value: vehicle.mileage, unitCode: 'SMI' },
    color: vehicle.exterior_color,
    vehicleInteriorColor: vehicle.interior_color,
    bodyType: vehicle.body_type ? bodyTypeLabels[vehicle.body_type] : null,
    fuelType: vehicle.fuel_type ? fuelTypeLabels[vehicle.fuel_type] : null,
    driveWheelConfiguration: vehicle.drivetrain ? drivetrainLabels[vehicle.drivetrain] : null,
    vehicleTransmission: vehicle.transmission ? transmissionLabels[vehicle.transmission] : null,
    numberOfDoors: vehicle.doors,
    seatingCapacity: vehicle.seats,
    offers:
      vehicle.price_cents === null
        ? null
        : compact({
            '@type': 'Offer',
            price: (vehicle.price_cents / 100).toFixed(2),
            priceCurrency: 'USD',
            availability,
            url,
            seller: dealer
              ? compact({
                  '@type': 'AutoDealer',
                  name: dealer.display_name,
                  telephone: dealer.phone_e164,
                  address: dealer.address_line1
                    ? compact({
                        '@type': 'PostalAddress',
                        streetAddress: dealer.address_line1,
                        addressLocality: dealer.city,
                        addressRegion: dealer.state,
                        postalCode: dealer.postal_code,
                        addressCountry: 'US',
                      })
                    : null,
                })
              : null,
          }),
  });
}

/** Safe for `dangerouslySetInnerHTML`: `<` can't close the script tag. */
export function serializeJsonLd(value: JsonLd): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
