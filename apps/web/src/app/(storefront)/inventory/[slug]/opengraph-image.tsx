import { formatMileage, formatPrice } from '@cp/core';
import { ImageResponse } from 'next/og';

import { getSiteInfo } from '@/lib/site';
import { getVehicle } from '@/lib/storefront';

export const alt = 'Vehicle photo with price';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Share card: cover photo, title and the exact listing price. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [vehicle, { settings }] = await Promise.all([getVehicle(slug), getSiteInfo()]);
  const cover = vehicle?.images[0]?.url;
  const facts = vehicle
    ? [vehicle.mileage === null ? null : formatMileage(vehicle.mileage), vehicle.exterior_color]
        .filter(Boolean)
        .join(' · ')
    : '';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: '#09090b',
        color: '#fafaf9',
        fontFamily: 'sans-serif',
      }}
    >
      {cover ? (
        <img
          src={cover}
          alt=""
          width={1200}
          height={630}
          style={{ position: 'absolute', inset: 0, objectFit: 'cover' }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(9,9,11,0) 35%, rgba(9,9,11,0.92) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 56,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760 }}>
          <div style={{ fontSize: 28, opacity: 0.8 }}>{settings.brand_name}</div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05 }}>
            {vehicle?.title ?? 'Vehicle not found'}
          </div>
          {facts ? <div style={{ fontSize: 30, opacity: 0.85 }}>{facts}</div> : null}
        </div>
        {vehicle?.price_cents != null ? (
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              padding: '12px 28px',
              borderRadius: 24,
              background: '#fafaf9',
              color: '#09090b',
            }}
          >
            {formatPrice(vehicle.price_cents)}
          </div>
        ) : null}
      </div>
    </div>,
    size,
  );
}
