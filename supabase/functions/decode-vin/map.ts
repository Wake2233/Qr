/**
 * Maps an NHTSA vPIC `DecodeVinValuesExtended` result onto our vehicle columns.
 * Only confident matches are filled; everything else is left null for the dealer to enter.
 */

export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export type VpicResult = Record<string, string | null | undefined>;

export interface DecodedVin {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  body_type: string | null;
  fuel_type: string | null;
  drivetrain: string | null;
  transmission: string | null;
  engine: string | null;
  cylinders: number | null;
  displacement_l: number | null;
  horsepower: number | null;
  doors: number | null;
  seats: number | null;
  warnings: string[];
}

const text = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== 'Not Applicable' && trimmed !== '0' ? trimmed : null;
};

const int = (value: string | null | undefined, min: number, max: number): number | null => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** vPIC upper-cases makes ("MERCEDES-BENZ"); show them the way buyers write them. */
export function titleCaseMake(make: string): string {
  if (make.length <= 3) return make.toUpperCase(); // BMW, GMC, RAM, KIA → keep acronyms
  return make
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function bodyType(bodyClass: string | null): string | null {
  if (!bodyClass) return null;
  const b = bodyClass.toLowerCase();
  if (b.includes('minivan')) return 'minivan';
  if (b.includes('van')) return 'van';
  if (b.includes('pickup')) return 'pickup';
  if (b.includes('sport utility') || b.includes('crossover') || b.includes('suv')) return 'suv';
  if (b.includes('convertible') || b.includes('cabriolet') || b.includes('roadster')) {
    return 'convertible';
  }
  if (b.includes('coupe')) return 'coupe';
  if (b.includes('wagon')) return 'wagon';
  if (b.includes('hatchback') || b.includes('liftback')) return 'hatchback';
  if (b.includes('sedan') || b.includes('saloon')) return 'sedan';
  return null;
}

function fuelType(r: VpicResult): string | null {
  const level = (text(r.ElectrificationLevel) ?? '').toLowerCase();
  const primary = (text(r.FuelTypePrimary) ?? '').toLowerCase();
  const secondary = (text(r.FuelTypeSecondary) ?? '').toLowerCase();
  if (level.startsWith('bev') || (primary === 'electric' && !secondary)) return 'electric';
  if (level.startsWith('phev')) return 'plug_in_hybrid';
  if (level.includes('hev') || secondary === 'electric') return 'hybrid';
  if (primary.includes('flexible') || secondary.includes('ethanol')) return 'flex_fuel';
  if (primary.includes('diesel')) return 'diesel';
  if (primary.includes('gasoline')) return 'gasoline';
  return null;
}

function drivetrain(driveType: string | null): string | null {
  if (!driveType) return null;
  const d = driveType.toLowerCase();
  if (d.startsWith('awd') || d.includes('all-wheel')) return 'awd';
  if (d.startsWith('4wd') || d.includes('4x4') || d.includes('4-wheel')) return '4wd';
  if (d.startsWith('fwd') || d.includes('front-wheel')) return 'fwd';
  if (d.startsWith('rwd') || d.includes('rear-wheel')) return 'rwd';
  return null; // "4x2" doesn't say which axle
}

function transmission(style: string | null): string | null {
  if (!style) return null;
  const t = style.toLowerCase();
  if (t.includes('cvt') || t.includes('continuously')) return 'cvt';
  if (t.includes('dct') || t.includes('dual-clutch') || t.includes('dual clutch')) return 'dct';
  if (t.includes('manual') || t.includes('standard')) return 'manual';
  if (t.includes('automatic')) return 'automatic';
  return null;
}

function engine(r: VpicResult, cylinders: number | null, displacement: number | null) {
  const parts = [
    displacement ? `${displacement.toFixed(1)}L` : null,
    cylinders ? `${cylinders}-cylinder` : null,
    text(r.Turbo) === 'Yes' ? 'turbo' : null,
    text(r.EngineModel) ? `(${text(r.EngineModel)})` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' ').slice(0, 80) : null;
}

/** vPIC error codes that still return a usable decode (e.g. "check digit" on older VINs). */
const SOFT_ERRORS = new Set(['0', '1', '6', '12', '14']);

export function mapVpicResult(r: VpicResult): DecodedVin {
  const codes = (text(r.ErrorCode) ?? '0').split(',').map((c) => c.trim());
  const warnings = codes.some((c) => c !== '0')
    ? (text(r.ErrorText) ?? '')
        .split(';')
        .map((w) => w.trim())
        .filter(Boolean)
    : [];

  const cylinders = int(r.EngineCylinders, 1, 16);
  const displacementRaw = Number.parseFloat(r.DisplacementL ?? '');
  const displacement =
    Number.isFinite(displacementRaw) && displacementRaw > 0 && displacementRaw < 100
      ? Math.round(displacementRaw * 10) / 10
      : null;
  const hp = Number.parseFloat(r.EngineHP ?? '');
  const make = text(r.Make);

  return {
    year: int(r.ModelYear, 1950, 2100),
    make: make ? titleCaseMake(make) : null,
    model: text(r.Model),
    trim: text(r.Trim)?.slice(0, 80) ?? null,
    body_type: bodyType(text(r.BodyClass)),
    fuel_type: fuelType(r),
    drivetrain: drivetrain(text(r.DriveType)),
    transmission: transmission(text(r.TransmissionStyle)),
    engine: engine(r, cylinders, displacement),
    cylinders,
    displacement_l: displacement,
    horsepower: Number.isFinite(hp) && hp > 0 && hp < 5000 ? Math.round(hp) : null,
    doors: int(r.Doors, 1, 6),
    seats: int(r.Seats, 1, 15),
    warnings,
  };
}

/** True when vPIC could not decode the VIN at all (no make/model/year). */
export function isUndecodable(r: VpicResult): boolean {
  const codes = (text(r.ErrorCode) ?? '0').split(',').map((c) => c.trim());
  const usable = Boolean(text(r.Make) && text(r.ModelYear));
  return !usable || codes.some((c) => !SOFT_ERRORS.has(c) && !text(r.Model));
}
