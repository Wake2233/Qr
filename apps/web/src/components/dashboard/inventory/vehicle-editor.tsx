'use client';

import type { ConsoleVehicleDetail } from '@cp/api';
import {
  bodyTypeLabels,
  conditionLabels,
  drivetrainLabels,
  featureCategoryLabels,
  fuelTypeLabels,
  listingStatusActions,
  titleStatusLabels,
  transmissionLabels,
} from '@cp/core';
import type { Enums } from '@cp/types';
import {
  maxModelYear,
  vehiclePublishableSchema,
  vehicleUpsertSchema,
  type VehicleUpsert,
  type VehicleUpsertInput,
} from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2, ScanLine, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import {
  decodeVinAction,
  saveAndPublishVehicle,
  saveVehicle,
} from '@/app/dashboard/inventory/actions';
import {
  Field,
  MoneyInput,
  NumberInput,
  OptionSelect,
  optionsOf,
} from '@/components/dashboard/form-fields';
import { ListingStatusBadge } from '@/components/dashboard/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { StatusMenu } from './status-menu';

export interface EditorCatalog {
  makes: { id: number; name: string }[];
  models: {
    id: number;
    make_id: number;
    name: string;
    default_body_type: Enums<'body_type'> | null;
  }[];
  features: { id: number; name: string; category: Enums<'feature_category'> }[];
}

export interface EditorDealer {
  id: string;
  name: string;
  status: Enums<'dealer_status'>;
}

interface VehicleEditorProps {
  vehicle: ConsoleVehicleDetail | null;
  catalog: EditorCatalog;
  dealers: EditorDealer[];
  isAdmin: boolean;
  /** Rendered in the Photos section (existing listings only). */
  photos?: ReactNode;
}

export const EDITOR_SECTIONS = [
  { id: 'basics', label: 'Basics' },
  { id: 'powertrain', label: 'Powertrain' },
  { id: 'body', label: 'Body & interior' },
  { id: 'history', label: 'History' },
  { id: 'features', label: 'Features' },
  { id: 'description', label: 'Description' },
  { id: 'photos', label: 'Photos' },
] as const;

type FormValues = VehicleUpsertInput;

function toFormValues(vehicle: ConsoleVehicleDetail | null, dealerId: string): FormValues {
  if (!vehicle) {
    return {
      dealer_id: dealerId,
      make_id: 0,
      model_id: 0,
      year: new Date().getFullYear(),
      condition: 'used',
      title_status: 'clean',
      feature_ids: [],
    };
  }
  const {
    make: _make,
    model: _model,
    dealer: _dealer,
    images: _images,
    title: _title,
    ...v
  } = vehicle;
  return {
    dealer_id: v.dealer_id,
    make_id: v.make_id,
    model_id: v.model_id,
    year: v.year,
    trim: v.trim,
    condition: v.condition,
    vin: v.vin,
    stock_number: v.stock_number,
    body_type: v.body_type,
    mileage: v.mileage,
    price_cents: v.price_cents,
    msrp_cents: v.msrp_cents,
    exterior_color: v.exterior_color,
    interior_color: v.interior_color,
    fuel_type: v.fuel_type,
    drivetrain: v.drivetrain,
    transmission: v.transmission,
    engine: v.engine,
    cylinders: v.cylinders,
    displacement_l: v.displacement_l,
    horsepower: v.horsepower,
    torque_lbft: v.torque_lbft,
    mpg_city: v.mpg_city,
    mpg_highway: v.mpg_highway,
    ev_range_mi: v.ev_range_mi,
    doors: v.doors,
    seats: v.seats,
    owners_count: v.owners_count,
    accident_free: v.accident_free,
    title_status: v.title_status,
    description: v.description,
    is_featured: v.is_featured,
    feature_ids: v.feature_ids,
  };
}

const ACCIDENT_OPTIONS = [
  { value: 'yes', label: 'No accidents reported' },
  { value: 'no', label: 'Accident reported' },
] as const;

export function VehicleEditor({ vehicle, catalog, dealers, isAdmin, photos }: VehicleEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [decoding, setDecoding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imagesError, setImagesError] = useState<string | undefined>();

  const form = useForm<FormValues, unknown, VehicleUpsert>({
    resolver: zodResolver(vehicleUpsertSchema),
    defaultValues: toFormValues(vehicle, dealers[0]?.id ?? ''),
    mode: 'onTouched',
  });
  const { control, register, handleSubmit, setValue, setError, formState } = form;
  const errors = formState.errors;

  const makeId = useWatch({ control, name: 'make_id' });
  const dealerId = useWatch({ control, name: 'dealer_id' });
  const dealer = dealers.find((d) => d.id === dealerId);
  const dealerApproved = dealer?.status === 'approved';
  const models = useMemo(
    () => catalog.models.filter((model) => model.make_id === makeId),
    [catalog.models, makeId],
  );
  const featuresByCategory = useMemo(() => {
    const groups = new Map<Enums<'feature_category'>, EditorCatalog['features']>();
    for (const feature of catalog.features) {
      groups.set(feature.category, [...(groups.get(feature.category) ?? []), feature]);
    }
    return [...groups.entries()];
  }, [catalog.features]);

  // Deep links like `#photos` target sections that stream in after the initial navigation.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: 'start' });
  }, []);

  const status = vehicle?.status ?? 'draft';
  const canPublish = listingStatusActions(status, { isAdmin }).some((action) => action.publishes);

  const applyServerErrors = (fieldErrors?: Record<string, string[]>) => {
    if (!fieldErrors) return;
    let first: string | null = null;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages[0] ?? 'Invalid value';
      if (field === 'images') setImagesError(message);
      else setError(field as FieldPath<FormValues>, { type: 'server', message });
      first ??= field;
    }
    if (first) {
      document
        .querySelector(first === 'images' ? '#photos' : `[name="${first}"], #field-${first}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const onSave = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await saveVehicle(vehicle?.id ?? null, values);
      if (!result.ok) {
        setFormError(result.error);
        applyServerErrors(result.fieldErrors);
        return;
      }
      if (vehicle) {
        toast.success('Changes saved');
        form.reset(values);
      } else {
        toast.success('Draft created. Add photos next.');
        router.push(`/dashboard/inventory/${result.data.id}#photos`);
      }
    });
  });

  const onPublish = handleSubmit((values) => {
    if (!vehicle) return;
    setFormError(null);
    setImagesError(undefined);
    // Mirror the database publish gate so the dealer sees every missing field at once.
    const check = vehiclePublishableSchema.safeParse({
      ...values,
      image_count: vehicle.images.length,
    });
    if (!check.success) {
      applyServerErrors(
        Object.fromEntries(
          check.error.issues.map((issue) => [
            issue.path[0] === 'image_count' ? 'images' : String(issue.path[0]),
            [issue.message],
          ]),
        ),
      );
      setFormError('A few details are needed before this listing can go live.');
      return;
    }
    startTransition(async () => {
      const result = await saveAndPublishVehicle(vehicle.id, values);
      if (!result.ok) {
        setFormError(result.error);
        applyServerErrors(result.fieldErrors);
        return;
      }
      form.reset(values);
      toast.success(
        result.data.status === 'pending_review'
          ? 'Submitted for review. It goes live once an admin approves it.'
          : 'Published. Buyers can see it now.',
      );
    });
  });

  const decode = () => {
    const vin = (form.getValues('vin') ?? '').trim().toUpperCase();
    setDecoding(true);
    startTransition(async () => {
      const result = await decodeVinAction(vin);
      setDecoding(false);
      if (!result.ok) {
        setError('vin', { type: 'server', message: result.fieldErrors?.vin?.[0] ?? result.error });
        return;
      }
      const d = result.data;
      const opts = { shouldDirty: true, shouldValidate: false } as const;
      setValue('vin', d.vin, opts);
      if (d.year) setValue('year', d.year, opts);
      if (d.make_id) setValue('make_id', d.make_id, opts);
      if (d.model_id) setValue('model_id', d.model_id, opts);
      const fill = {
        trim: d.trim,
        body_type: d.body_type,
        fuel_type: d.fuel_type,
        drivetrain: d.drivetrain,
        transmission: d.transmission,
        engine: d.engine,
        cylinders: d.cylinders,
        displacement_l: d.displacement_l,
        horsepower: d.horsepower,
        doors: d.doors,
        seats: d.seats,
      } as const;
      let filled = 0;
      for (const [key, value] of Object.entries(fill) as [keyof typeof fill, unknown][]) {
        if (value !== null && value !== undefined) {
          setValue(key, value as never, opts);
          filled += 1;
        }
      }
      toast.success(
        `Decoded ${[d.year, d.make, d.model].filter(Boolean).join(' ')}: ${filled} fields filled. Review before saving.`,
      );
      for (const warning of d.warnings) toast.warning(warning);
    });
  };

  const err = (name: FieldPath<FormValues>) => {
    const fieldError = name
      .split('.')
      .reduce<unknown>(
        (node, key) =>
          node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined,
        errors,
      );
    return fieldError && typeof fieldError === 'object' && 'message' in fieldError
      ? String(fieldError.message)
      : undefined;
  };

  return (
    <form onSubmit={onSave} className="grid gap-8 lg:grid-cols-[180px_1fr]" noValidate>
      <nav aria-label="Editor sections" className="hidden lg:block">
        <ul className="sticky top-24 space-y-1 text-sm">
          {EDITOR_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-3 py-2"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-6 pb-28">
        {vehicle && dealer && !dealerApproved ? (
          <Alert>
            <AlertTriangle />
            <AlertTitle>Publishing unlocks once {dealer.name} is approved</AlertTitle>
            <AlertDescription>
              You can prepare and save drafts now. An admin reviews new dealerships, usually within
              one business day.
            </AlertDescription>
          </Alert>
        ) : null}
        {formError ? (
          <Alert variant="destructive" role="alert">
            <AlertTriangle />
            <AlertTitle>{formError}</AlertTitle>
          </Alert>
        ) : null}

        <Section
          id="basics"
          title="Basics"
          description="Identity, price and mileage. VIN decode fills most of the specs."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="VIN"
              error={err('vin')}
              className="sm:col-span-2"
              hint="17 characters. Decode to fill year, make, model and specs."
            >
              {(p) => (
                <div className="flex gap-2">
                  <Input
                    {...p}
                    {...register('vin', {
                      setValueAs: (v: string) => (v ? v.trim().toUpperCase() : null),
                    })}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={17}
                    className="font-mono uppercase"
                    placeholder="5UXCR6C05M9F12345"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={decode}
                    disabled={decoding || pending}
                  >
                    {decoding ? <Loader2 className="animate-spin" /> : <ScanLine />} Decode
                  </Button>
                </div>
              )}
            </Field>
            {dealers.length > 1 ? (
              <Field label="Dealer" error={err('dealer_id')} className="sm:col-span-2">
                {(p) => (
                  <Controller
                    control={control}
                    name="dealer_id"
                    render={({ field }) => (
                      <OptionSelect
                        {...p}
                        allowNone={false}
                        value={field.value}
                        onChange={(value) => field.onChange(value ?? '')}
                        options={dealers.map((d) => ({
                          value: d.id,
                          label: d.status === 'approved' ? d.name : `${d.name} (${d.status})`,
                        }))}
                      />
                    )}
                  />
                )}
              </Field>
            ) : null}
            <Field label="Year" error={err('year')}>
              {(p) => (
                <Controller
                  control={control}
                  name="year"
                  render={({ field }) => (
                    <OptionSelect
                      {...p}
                      allowNone={false}
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? new Date().getFullYear())}
                      options={Array.from({ length: maxModelYear() - 1950 + 1 }, (_, i) => {
                        const year = maxModelYear() - i;
                        return { value: year, label: String(year) };
                      })}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Condition" error={err('condition')}>
              {(p) => (
                <Controller
                  control={control}
                  name="condition"
                  render={({ field }) => (
                    <OptionSelect
                      {...p}
                      allowNone={false}
                      value={field.value ?? 'used'}
                      onChange={(value) => field.onChange(value ?? 'used')}
                      options={optionsOf(conditionLabels)}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Make" error={err('make_id')}>
              {(p) => (
                <Controller
                  control={control}
                  name="make_id"
                  render={({ field }) => (
                    <OptionSelect
                      {...p}
                      allowNone={false}
                      placeholder="Select a make"
                      value={field.value || null}
                      onChange={(value) => {
                        if ((value ?? 0) === field.value) return;
                        field.onChange(value ?? 0);
                        setValue('model_id', 0);
                      }}
                      options={catalog.makes.map((m) => ({ value: m.id, label: m.name }))}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Model" error={err('model_id')}>
              {(p) => (
                <Controller
                  control={control}
                  name="model_id"
                  render={({ field }) => (
                    <OptionSelect
                      {...p}
                      allowNone={false}
                      disabled={!makeId}
                      placeholder={makeId ? 'Select a model' : 'Pick a make first'}
                      value={field.value || null}
                      onChange={(value) => {
                        field.onChange(value ?? 0);
                        const model = catalog.models.find((m) => m.id === value);
                        if (model?.default_body_type && !form.getValues('body_type')) {
                          setValue('body_type', model.default_body_type, { shouldDirty: true });
                        }
                      }}
                      options={models.map((m) => ({ value: m.id, label: m.name }))}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Trim" error={err('trim')}>
              {(p) => <Input {...p} {...register('trim')} placeholder="xDrive40i" />}
            </Field>
            <Field label="Stock number" error={err('stock_number')}>
              {(p) => <Input {...p} {...register('stock_number')} placeholder="A1234" />}
            </Field>
            <Field label="Price" error={err('price_cents')} required>
              {(p) => (
                <Controller
                  control={control}
                  name="price_cents"
                  render={({ field }) => (
                    <MoneyInput
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="MSRP" error={err('msrp_cents')} hint="Optional. Original sticker price.">
              {(p) => (
                <Controller
                  control={control}
                  name="msrp_cents"
                  render={({ field }) => (
                    <MoneyInput
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              )}
            </Field>
            <Field label="Mileage" error={err('mileage')} required>
              {(p) => (
                <NumberControl
                  name="mileage"
                  control={control}
                  fieldProps={p}
                  placeholder="42180"
                />
              )}
            </Field>
            {isAdmin ? (
              <div className="flex items-center gap-3 self-end pb-2">
                <Controller
                  control={control}
                  name="is_featured"
                  render={({ field }) => (
                    <Switch
                      id="is_featured"
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is_featured">Featured on the home page</Label>
              </div>
            ) : null}
          </div>
        </Section>

        <Section id="powertrain" title="Powertrain">
          <div className="grid gap-4 sm:grid-cols-2">
            <EnumField
              control={control}
              name="fuel_type"
              label="Fuel type"
              labels={fuelTypeLabels}
              error={err('fuel_type')}
              required
            />
            <EnumField
              control={control}
              name="transmission"
              label="Transmission"
              labels={transmissionLabels}
              error={err('transmission')}
              required
            />
            <EnumField
              control={control}
              name="drivetrain"
              label="Drivetrain"
              labels={drivetrainLabels}
              error={err('drivetrain')}
              required
            />
            <Field label="Engine" error={err('engine')}>
              {(p) => <Input {...p} {...register('engine')} placeholder="3.0L 6-cylinder turbo" />}
            </Field>
            <Field label="Cylinders" error={err('cylinders')}>
              {(p) => <NumberControl name="cylinders" control={control} fieldProps={p} />}
            </Field>
            <Field label="Displacement (L)" error={err('displacement_l')}>
              {(p) => (
                <NumberControl
                  name="displacement_l"
                  control={control}
                  fieldProps={p}
                  decimals={1}
                />
              )}
            </Field>
            <Field label="Horsepower" error={err('horsepower')}>
              {(p) => <NumberControl name="horsepower" control={control} fieldProps={p} />}
            </Field>
            <Field label="Torque (lb-ft)" error={err('torque_lbft')}>
              {(p) => <NumberControl name="torque_lbft" control={control} fieldProps={p} />}
            </Field>
            <Field label="MPG city" error={err('mpg_city')}>
              {(p) => <NumberControl name="mpg_city" control={control} fieldProps={p} />}
            </Field>
            <Field label="MPG highway" error={err('mpg_highway')}>
              {(p) => <NumberControl name="mpg_highway" control={control} fieldProps={p} />}
            </Field>
            <Field label="EV range (mi)" error={err('ev_range_mi')}>
              {(p) => <NumberControl name="ev_range_mi" control={control} fieldProps={p} />}
            </Field>
          </div>
        </Section>

        <Section id="body" title="Body & interior">
          <div className="grid gap-4 sm:grid-cols-2">
            <EnumField
              control={control}
              name="body_type"
              label="Body style"
              labels={bodyTypeLabels}
              error={err('body_type')}
              required
            />
            <Field label="Exterior color" error={err('exterior_color')} required>
              {(p) => <Input {...p} {...register('exterior_color')} placeholder="Mineral White" />}
            </Field>
            <Field label="Interior color" error={err('interior_color')}>
              {(p) => <Input {...p} {...register('interior_color')} placeholder="Black leather" />}
            </Field>
            <Field label="Doors" error={err('doors')}>
              {(p) => <NumberControl name="doors" control={control} fieldProps={p} />}
            </Field>
            <Field label="Seats" error={err('seats')}>
              {(p) => <NumberControl name="seats" control={control} fieldProps={p} />}
            </Field>
          </div>
        </Section>

        <Section id="history" title="History">
          <div className="grid gap-4 sm:grid-cols-2">
            <EnumField
              control={control}
              name="title_status"
              label="Title"
              labels={titleStatusLabels}
              error={err('title_status')}
              allowNone={false}
            />
            <Field label="Previous owners" error={err('owners_count')}>
              {(p) => <NumberControl name="owners_count" control={control} fieldProps={p} />}
            </Field>
            <Field label="Accident history" error={err('accident_free')}>
              {(p) => (
                <Controller
                  control={control}
                  name="accident_free"
                  render={({ field }) => (
                    <OptionSelect
                      {...p}
                      value={field.value == null ? null : field.value ? 'yes' : 'no'}
                      onChange={(value) => field.onChange(value == null ? null : value === 'yes')}
                      options={ACCIDENT_OPTIONS}
                    />
                  )}
                />
              )}
            </Field>
          </div>
        </Section>

        <Section id="features" title="Features" description="Buyers can filter by these.">
          <Controller
            control={control}
            name="feature_ids"
            render={({ field }) => {
              const selected = new Set(field.value ?? []);
              return (
                <div className="grid gap-6 sm:grid-cols-2">
                  {featuresByCategory.map(([category, features]) => (
                    <fieldset key={category} className="space-y-2">
                      <legend className="mb-2 text-sm font-medium">
                        {featureCategoryLabels[category]}
                      </legend>
                      {features.map((feature) => (
                        <label key={feature.id} className="flex min-h-8 items-center gap-2 text-sm">
                          <Checkbox
                            checked={selected.has(feature.id)}
                            onCheckedChange={(on) => {
                              const next = new Set(selected);
                              if (on === true) next.add(feature.id);
                              else next.delete(feature.id);
                              field.onChange([...next]);
                            }}
                          />
                          {feature.name}
                        </label>
                      ))}
                    </fieldset>
                  ))}
                </div>
              );
            }}
          />
        </Section>

        <Section id="description" title="Description">
          <Field
            label="Description"
            error={err('description')}
            hint="Shown on the listing page. Plain text, up to 10,000 characters."
          >
            {(p) => <Textarea {...p} {...register('description')} rows={8} />}
          </Field>
        </Section>

        <Section
          id="photos"
          title="Photos"
          description={vehicle ? undefined : 'Save the draft first, then add photos.'}
        >
          {photos ?? (
            <p className="text-muted-foreground text-sm">
              Photos can be added once the draft is saved.
            </p>
          )}
          {imagesError &&
          !(vehicle && vehicle.images.length > 0 && imagesError === 'Add at least one photo') ? (
            <p className="text-destructive text-sm" role="alert">
              {imagesError}
            </p>
          ) : null}
        </Section>
      </div>

      <div className="bg-background/90 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          {vehicle ? (
            <StatusMenu
              vehicleId={vehicle.id}
              status={status}
              dealerApproved={dealerApproved}
              isAdmin={isAdmin}
            />
          ) : (
            <ListingStatusBadge status="draft" />
          )}
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {formState.isDirty ? 'Unsaved changes' : vehicle ? 'All changes saved' : 'New listing'}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              type="submit"
              variant={canPublish && vehicle ? 'outline' : 'default'}
              disabled={pending}
            >
              {pending && !decoding ? <Loader2 className="animate-spin" /> : null}
              {vehicle ? 'Save changes' : 'Save draft'}
            </Button>
            {vehicle && canPublish ? (
              <Button
                type="button"
                onClick={onPublish}
                disabled={pending || !dealerApproved}
                title={dealerApproved ? undefined : 'Your dealership must be approved first'}
              >
                <Send /> {status === 'pending_review' ? 'Approve & publish' : 'Publish'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="bg-card scroll-mt-24 space-y-4 rounded-xl border p-5 sm:p-6"
    >
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="font-display text-lg font-semibold">
          {title}
        </h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

type NumberName =
  | 'mileage'
  | 'cylinders'
  | 'displacement_l'
  | 'horsepower'
  | 'torque_lbft'
  | 'mpg_city'
  | 'mpg_highway'
  | 'ev_range_mi'
  | 'doors'
  | 'seats'
  | 'owners_count';

function NumberControl({
  name,
  control,
  fieldProps,
  decimals = 0,
  placeholder,
}: {
  name: NumberName;
  control: ReturnType<typeof useForm<FormValues, unknown, VehicleUpsert>>['control'];
  fieldProps: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string };
  decimals?: 0 | 1;
  placeholder?: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <NumberInput
          {...fieldProps}
          decimals={decimals}
          placeholder={placeholder}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

type EnumName = 'fuel_type' | 'transmission' | 'drivetrain' | 'body_type' | 'title_status';

function EnumField<T extends string>({
  control,
  name,
  label,
  labels,
  error,
  required,
  allowNone = true,
}: {
  control: ReturnType<typeof useForm<FormValues, unknown, VehicleUpsert>>['control'];
  name: EnumName;
  label: string;
  labels: Record<T, string>;
  error?: string;
  required?: boolean;
  allowNone?: boolean;
}) {
  return (
    <Field label={label} error={error} required={required}>
      {(p) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <OptionSelect
              {...p}
              allowNone={allowNone}
              value={(field.value as T | null | undefined) ?? null}
              onChange={field.onChange}
              options={optionsOf(labels)}
            />
          )}
        />
      )}
    </Field>
  );
}
