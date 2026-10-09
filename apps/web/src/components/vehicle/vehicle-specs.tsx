import { groupFeatures, groupVehicleSpecs, type VehicleSpecSource } from '@cp/core';
import type { Tables } from '@cp/types';
import { Check } from 'lucide-react';

import { CopyValue } from './copy-value';

const COPYABLE = new Set(['vin', 'stock_number']);

/** Every non-null spec, grouped Overview / Powertrain / Body & Interior / History. */
export function VehicleSpecs({ vehicle }: { vehicle: VehicleSpecSource }) {
  const groups = groupVehicleSpecs(vehicle);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`spec-${group.id}`}
          className="rounded-2xl border p-5"
        >
          <h2 id={`spec-${group.id}`} className="mb-3 font-semibold">
            {group.title}
          </h2>
          <dl className="divide-y text-sm">
            {group.rows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium" data-spec={row.key}>
                  {COPYABLE.has(row.key) ? (
                    <CopyValue value={row.value} label={row.label} />
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function VehicleFeatures({
  features,
}: {
  features: Pick<Tables<'features'>, 'name' | 'category'>[];
}) {
  const groups = groupFeatures(features);
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby="features-title" className="space-y-4">
      <h2 id="features-title" className="font-display text-2xl font-semibold tracking-tight">
        Features
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold tracking-wide uppercase">
              {group.title}
            </h3>
            <ul className="space-y-1.5">
              {group.features.map((name) => (
                <li key={name} className="flex items-center gap-2 text-sm">
                  <Check className="text-primary size-4 shrink-0" aria-hidden /> {name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
