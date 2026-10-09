import {
  catalogQueries,
  decodeVin,
  setVehicleStatus,
  useSaveVehicle,
  type ConsoleVehicleDetail,
} from '@cp/api';
import {
  bodyTypeLabels,
  conditionLabels,
  drivetrainLabels,
  featureCategoryLabels,
  fuelTypeLabels,
  listingStatusActions,
  parseDbError,
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { toast } from 'sonner-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';
import { useScanStore } from '@/stores/scan';

import {
  FormSection,
  MoneyField,
  NumberField,
  optionsOf,
  SelectField,
  SwitchRow,
} from './form-fields';
import { PhotoManager } from './photo-manager';
import { ListingStatusChip } from './status-chip';

export interface EditorDealer {
  id: string;
  name: string;
  status: Enums<'dealer_status'>;
}

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
  const v = vehicle;
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

const YEARS = Array.from({ length: maxModelYear() - 1950 + 1 }, (_, i) => {
  const year = maxModelYear() - i;
  return { value: year, label: String(year) };
});

export function VehicleEditor({
  vehicle,
  dealers,
  isAdmin,
}: {
  vehicle: ConsoleVehicleDetail | null;
  dealers: EditorDealer[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { context } = useSession();
  const save = useSaveVehicle(supabase, context?.userId ?? '');
  const [publishing, setPublishing] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imagesError, setImagesError] = useState<string | undefined>();

  const makes = useQuery(catalogQueries.makes(supabase));
  const models = useQuery(catalogQueries.models(supabase));
  const features = useQuery(catalogQueries.features(supabase));

  const form = useForm<FormValues, unknown, VehicleUpsert>({
    resolver: zodResolver(vehicleUpsertSchema),
    defaultValues: toFormValues(vehicle, dealers[0]?.id ?? ''),
  });
  const { control, handleSubmit, setValue, setError, formState } = form;
  const errors = formState.errors;
  const makeId = useWatch({ control, name: 'make_id' });
  const dealerId = useWatch({ control, name: 'dealer_id' });
  const dealer = dealers.find((d) => d.id === dealerId);
  const dealerApproved = dealer?.status === 'approved';
  const status = vehicle?.status ?? 'draft';
  const canPublish = listingStatusActions(status, { isAdmin }).some((a) => a.publishes);

  const modelOptions = useMemo(
    () =>
      (models.data ?? [])
        .filter((m) => m.make_id === makeId)
        .map((m) => ({ value: m.id, label: m.name })),
    [models.data, makeId],
  );
  const featureGroups = useMemo(() => {
    const groups = new Map<Enums<'feature_category'>, { id: number; name: string }[]>();
    for (const f of features.data ?? [])
      groups.set(f.category, [...(groups.get(f.category) ?? []), f]);
    return [...groups.entries()];
  }, [features.data]);

  const err = (name: FieldPath<FormValues>) => {
    const value = (errors as Record<string, { message?: string } | undefined>)[name];
    return value?.message;
  };

  const applyErrors = (fieldErrors: Record<string, string>) => {
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field === 'images') setImagesError(message);
      else setError(field as FieldPath<FormValues>, { type: 'server', message });
    }
  };

  const failWith = (error: unknown) => {
    const parsed = parseDbError(error);
    setFormError(parsed.message);
    if (parsed.code === 'MISSING_IMAGES') setImagesError(parsed.message);
    applyErrors(
      Object.fromEntries(
        parsed.fields.map((f) => [
          f,
          parsed.code === 'MISSING_FIELDS' ? 'Required to publish' : parsed.message,
        ]),
      ),
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  // VIN scanned in the camera modal.
  const scannedVin = useScanStore((s) => s.vin);
  const clearScan = useScanStore((s) => s.setVin);
  useEffect(() => {
    if (!scannedVin) return;
    setValue('vin', scannedVin, { shouldDirty: true });
    clearScan(null);
    void decode(scannedVin);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per scan
  }, [scannedVin]);

  async function decode(vin: string) {
    setDecoding(true);
    try {
      const d = await decodeVin(supabase, vin.trim().toUpperCase());
      const opts = { shouldDirty: true } as const;
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
      for (const [key, value] of Object.entries(fill) as [keyof typeof fill, unknown][]) {
        if (value != null) setValue(key, value as never, opts);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`Decoded ${[d.year, d.make, d.model].filter(Boolean).join(' ')}`);
      for (const warning of d.warnings) toast.warning(warning);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setError('vin', {
        type: 'server',
        message: message.startsWith('UNDECODABLE_VIN')
          ? 'That VIN could not be decoded. Fill in the details by hand.'
          : message.startsWith('INVALID_VIN')
            ? 'Enter a valid 17-character VIN'
            : 'The VIN decoder is not responding. Try again.',
      });
    } finally {
      setDecoding(false);
    }
  }

  const onSave = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await save.mutateAsync({ id: vehicle?.id ?? null, input: values });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (vehicle) {
        form.reset(values);
        toast.success('Changes saved');
      } else {
        toast.success('Draft created. Add photos next.');
        router.replace({ pathname: '/manage/inventory/[id]', params: { id: result.id } });
      }
    } catch (error) {
      failWith(error);
    }
  });

  const onPublish = handleSubmit(async (values) => {
    if (!vehicle) return;
    setFormError(null);
    setImagesError(undefined);
    const check = vehiclePublishableSchema.safeParse({
      ...values,
      image_count: vehicle.images.length,
    });
    if (!check.success) {
      applyErrors(
        Object.fromEntries(
          check.error.issues.map((i) => [
            i.path[0] === 'image_count' ? 'images' : String(i.path[0]),
            i.message,
          ]),
        ),
      );
      setFormError('A few details are needed before this listing can go live.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setPublishing(true);
    try {
      await save.mutateAsync({ id: vehicle.id, input: values });
      const next = await setVehicleStatus(supabase, vehicle.id, 'active');
      await queryClient.invalidateQueries({ queryKey: ['console'] });
      form.reset(values);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(
        next === 'pending_review' ? 'Submitted for review' : 'Published. Buyers can see it now.',
      );
    } catch (error) {
      failWith(error);
    } finally {
      setPublishing(false);
    }
  });

  const enumSelect = <T extends string>(
    name: 'fuel_type' | 'transmission' | 'drivetrain' | 'body_type',
    label: string,
    labels: Record<T, string>,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SelectField
          label={label}
          required
          value={(field.value as T | null | undefined) ?? null}
          onChange={field.onChange}
          options={optionsOf(labels)}
          error={err(name)}
        />
      )}
    />
  );

  const text = (
    name: 'trim' | 'stock_number' | 'exterior_color' | 'interior_color' | 'engine',
    label: string,
    extra?: { required?: boolean; placeholder?: string },
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TextField
          label={label}
          required={extra?.required}
          placeholder={extra?.placeholder}
          value={field.value ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={err(name)}
        />
      )}
    />
  );

  const number = (
    name:
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
      | 'owners_count',
    label: string,
    extra?: { required?: boolean; decimals?: 0 | 1 },
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <NumberField
          label={label}
          required={extra?.required}
          decimals={extra?.decimals}
          value={field.value}
          onChange={field.onChange}
          error={err(name)}
        />
      )}
    />
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4 py-4 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        {vehicle && dealer && !dealerApproved ? (
          <View className="gap-1 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <Text variant="label">Publishing unlocks once {dealer.name} is approved</Text>
            <Text variant="caption">You can prepare and save drafts now.</Text>
          </View>
        ) : null}
        {formError ? (
          <View
            accessibilityRole="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3"
          >
            <Text variant="label" className="text-destructive">
              {formError}
            </Text>
          </View>
        ) : null}

        <FormSection title="Basics" description="Scan or type the VIN to fill most specs.">
          <Controller
            control={control}
            name="vin"
            render={({ field }) => (
              <TextField
                label="VIN"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={17}
                value={field.value ?? ''}
                onChangeText={(v) => field.onChange(v.toUpperCase() || null)}
                error={err('vin')}
                className="font-mono"
              />
            )}
          />
          <View className="flex-row gap-3">
            <Button
              title="Scan barcode"
              variant="outline"
              className="flex-1"
              onPress={() => router.push('/manage/inventory/scan')}
            />
            <Button
              title="Decode"
              variant="outline"
              className="flex-1"
              loading={decoding}
              onPress={() => void decode(form.getValues('vin') ?? '')}
            />
          </View>
          {dealers.length > 1 ? (
            <Controller
              control={control}
              name="dealer_id"
              render={({ field }) => (
                <SelectField
                  label="Dealer"
                  allowNone={false}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  options={dealers.map((d) => ({
                    value: d.id,
                    label: d.status === 'approved' ? d.name : `${d.name} (${d.status})`,
                  }))}
                />
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="year"
            render={({ field }) => (
              <SelectField
                label="Year"
                allowNone={false}
                value={field.value}
                onChange={(v) => field.onChange(v ?? new Date().getFullYear())}
                options={YEARS}
                error={err('year')}
              />
            )}
          />
          <Controller
            control={control}
            name="condition"
            render={({ field }) => (
              <SelectField
                label="Condition"
                allowNone={false}
                value={field.value ?? 'used'}
                onChange={(v) => field.onChange(v ?? 'used')}
                options={optionsOf(conditionLabels)}
              />
            )}
          />
          <Controller
            control={control}
            name="make_id"
            render={({ field }) => (
              <SelectField
                label="Make"
                allowNone={false}
                placeholder="Select a make"
                value={field.value || null}
                onChange={(v) => {
                  if ((v ?? 0) === field.value) return;
                  field.onChange(v ?? 0);
                  setValue('model_id', 0);
                }}
                options={(makes.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
                error={err('make_id')}
              />
            )}
          />
          <Controller
            control={control}
            name="model_id"
            render={({ field }) => (
              <SelectField
                label="Model"
                allowNone={false}
                disabled={!makeId}
                placeholder={makeId ? 'Select a model' : 'Pick a make first'}
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? 0)}
                options={modelOptions}
                error={err('model_id')}
              />
            )}
          />
          {text('trim', 'Trim')}
          {text('stock_number', 'Stock number')}
          <Controller
            control={control}
            name="price_cents"
            render={({ field }) => (
              <MoneyField
                label="Price"
                required
                value={field.value}
                onChange={field.onChange}
                error={err('price_cents')}
              />
            )}
          />
          <Controller
            control={control}
            name="msrp_cents"
            render={({ field }) => (
              <MoneyField
                label="MSRP"
                hint="Optional"
                value={field.value}
                onChange={field.onChange}
                error={err('msrp_cents')}
              />
            )}
          />
          {number('mileage', 'Mileage', { required: true })}
          {isAdmin ? (
            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => (
                <SwitchRow
                  label="Featured on the home page"
                  value={Boolean(field.value)}
                  onChange={field.onChange}
                />
              )}
            />
          ) : null}
        </FormSection>

        <FormSection title="Powertrain">
          {enumSelect('fuel_type', 'Fuel type', fuelTypeLabels)}
          {enumSelect('transmission', 'Transmission', transmissionLabels)}
          {enumSelect('drivetrain', 'Drivetrain', drivetrainLabels)}
          {text('engine', 'Engine')}
          {number('cylinders', 'Cylinders')}
          {number('displacement_l', 'Displacement (L)', { decimals: 1 })}
          {number('horsepower', 'Horsepower')}
          {number('torque_lbft', 'Torque (lb-ft)')}
          {number('mpg_city', 'MPG city')}
          {number('mpg_highway', 'MPG highway')}
          {number('ev_range_mi', 'EV range (mi)')}
        </FormSection>

        <FormSection title="Body & interior">
          {enumSelect('body_type', 'Body style', bodyTypeLabels)}
          {text('exterior_color', 'Exterior color', { required: true })}
          {text('interior_color', 'Interior color')}
          {number('doors', 'Doors')}
          {number('seats', 'Seats')}
        </FormSection>

        <FormSection title="History">
          <Controller
            control={control}
            name="title_status"
            render={({ field }) => (
              <SelectField
                label="Title"
                allowNone={false}
                value={field.value ?? 'clean'}
                onChange={(v) => field.onChange(v ?? 'clean')}
                options={optionsOf(titleStatusLabels)}
              />
            )}
          />
          {number('owners_count', 'Previous owners')}
          <Controller
            control={control}
            name="accident_free"
            render={({ field }) => (
              <SelectField
                label="Accident history"
                value={field.value == null ? null : field.value ? 'yes' : 'no'}
                onChange={(v) => field.onChange(v == null ? null : v === 'yes')}
                options={[
                  { value: 'yes', label: 'No accidents reported' },
                  { value: 'no', label: 'Accident reported' },
                ]}
              />
            )}
          />
        </FormSection>

        <FormSection title="Features" description="Buyers can filter by these.">
          <Controller
            control={control}
            name="feature_ids"
            render={({ field }) => {
              const selected = new Set(field.value ?? []);
              return (
                <View className="gap-4">
                  {featureGroups.map(([category, list]) => (
                    <View key={category} className="gap-2">
                      <Text variant="label">{featureCategoryLabels[category]}</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {list.map((feature) => {
                          const on = selected.has(feature.id);
                          return (
                            <Pressable
                              key={feature.id}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: on }}
                              onPress={() => {
                                const next = new Set(selected);
                                if (on) next.delete(feature.id);
                                else next.add(feature.id);
                                field.onChange([...next]);
                              }}
                              className={`min-h-11 justify-center rounded-full border px-3 ${on ? 'border-primary bg-primary/10' : 'border-border'}`}
                            >
                              <Text
                                variant="caption"
                                className={on ? 'text-primary' : 'text-foreground'}
                              >
                                {feature.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              );
            }}
          />
        </FormSection>

        <FormSection title="Description">
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <TextField
                label="Description"
                multiline
                textAlignVertical="top"
                className="h-40 py-3"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                error={err('description')}
              />
            )}
          />
        </FormSection>

        <FormSection
          title="Photos"
          description={vehicle ? undefined : 'Save the draft first, then add photos.'}
        >
          {vehicle ? (
            <PhotoManager
              vehicleId={vehicle.id}
              dealerId={vehicle.dealer_id}
              title={vehicle.title}
              images={vehicle.images}
              error={
                vehicle.images.length > 0 && imagesError === 'Add at least one photo'
                  ? undefined
                  : imagesError
              }
            />
          ) : (
            <Text variant="caption">Photos can be added once the draft is saved.</Text>
          )}
        </FormSection>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 border-t border-border bg-background px-4 pb-8 pt-3">
        <ListingStatusChip status={status} />
        <View className="flex-1" />
        <Button
          title={vehicle ? 'Save' : 'Save draft'}
          variant={vehicle && canPublish ? 'outline' : 'primary'}
          loading={save.isPending && !publishing}
          onPress={() => void onSave()}
        />
        {vehicle && canPublish ? (
          <Button
            title={status === 'pending_review' ? 'Approve' : 'Publish'}
            loading={publishing}
            disabled={!dealerApproved}
            onPress={() => void onPublish()}
          />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
