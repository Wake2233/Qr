'use client';

import { CREDIT_TIERS, DEFAULT_APR_BY_TIER, formatApr, renderWhatsAppTemplate } from '@cp/core';
import { siteSettingsSchema, type BusinessHours, type SiteSettingsInput } from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTransition, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { saveSiteSettings } from '@/app/dashboard/settings/actions';
import { BusinessHoursEditor } from '@/components/dashboard/business-hours-editor';
import { Field, firstErrorMessage, NumberInput } from '@/components/dashboard/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const TIER_LABELS: Record<(typeof CREDIT_TIERS)[number], string> = {
  excellent: 'Excellent (720+)',
  good: 'Good (660–719)',
  fair: 'Fair (600–659)',
  rebuilding: 'Rebuilding (<600)',
};

export function SiteSettingsForm({ initial }: { initial: SiteSettingsInput }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: initial,
    mode: 'onTouched',
  });
  const { control, register, formState } = form;
  const template = useWatch({ control, name: 'whatsapp_template' });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveSiteSettings(values);
      if (!result.ok) {
        toast.error(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as FieldPath<SiteSettingsInput>, { message: messages[0] });
        }
        return;
      }
      form.reset(values);
      toast.success('Settings saved. The storefront updates immediately.');
    }),
  );

  const preview = renderWhatsAppTemplate(template ?? '', {
    title: '2021 BMW X5 xDrive40i',
    price: '$45,990',
    stock: 'A123',
    vin: '5UXCR6C05M9F12345',
    url: 'https://example.com/inventory/2021-bmw-x5',
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card
        title="Brand & contact"
        description="Used across the site and as the fallback for dealers without their own numbers."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Brand name"
            error={formState.errors.brand_name?.message}
            className="sm:col-span-2"
          >
            {(p) => <Input {...p} {...register('brand_name')} />}
          </Field>
          <Field
            label="Default phone (Call Us)"
            error={formState.errors.default_phone_e164?.message}
          >
            {(p) => <Input {...p} {...register('default_phone_e164')} type="tel" />}
          </Field>
          <Field label="Default WhatsApp" error={formState.errors.default_whatsapp_e164?.message}>
            {(p) => <Input {...p} {...register('default_whatsapp_e164')} type="tel" />}
          </Field>
        </div>
      </Card>

      <Card
        title="WhatsApp message"
        description="Prefilled when a buyer taps “Contact via WhatsApp”. Placeholders: {title}, {price}, {stock}, {vin}, {url}."
      >
        <Field label="Message template" error={formState.errors.whatsapp_template?.message}>
          {(p) => <Textarea {...p} {...register('whatsapp_template')} rows={3} />}
        </Field>
        <div className="bg-muted/60 rounded-lg p-3 text-sm">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            Preview
          </p>
          {preview}
        </div>
      </Card>

      <Card title="Business hours" description="Shown in the footer and on the contact page.">
        <Controller
          control={control}
          name="business_hours"
          render={({ field, fieldState }) => (
            <BusinessHoursEditor
              value={(field.value ?? {}) as BusinessHours}
              onChange={field.onChange}
              error={firstErrorMessage(fieldState.error)}
            />
          )}
        />
      </Card>

      <Card
        title="Financing"
        description="Estimated APR per credit tier for the payment calculators. Offers are simulated pre-qualification estimates, not credit decisions."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {CREDIT_TIERS.map((tier) => (
            <Field
              key={tier}
              label={`${TIER_LABELS[tier]} APR (%)`}
              error={firstErrorMessage(formState.errors.apr_by_tier?.[tier])}
            >
              {(p) => (
                <Controller
                  control={control}
                  name={`apr_by_tier.${tier}`}
                  render={({ field }) => (
                    <NumberInput
                      {...p}
                      decimals={1}
                      placeholder={formatApr(DEFAULT_APR_BY_TIER[tier]).replace('%', '')}
                      // Stored as basis points; edited as a percentage.
                      value={field.value == null ? null : field.value / 100}
                      onChange={(percent) =>
                        field.onChange(percent == null ? undefined : Math.round(percent * 100))
                      }
                      onBlur={field.onBlur}
                    />
                  )}
                />
              )}
            </Field>
          ))}
          <Field
            label="Lender network size (marketing)"
            error={formState.errors.lender_network_size?.message}
          >
            {(p) => (
              <Controller
                control={control}
                name="lender_network_size"
                render={({ field }) => (
                  <NumberInput
                    {...p}
                    value={field.value}
                    onChange={(n) => field.onChange(n ?? 0)}
                    onBlur={field.onBlur}
                  />
                )}
              />
            )}
          </Field>
        </div>
      </Card>

      <Card title="Listing review">
        <div className="flex items-start gap-3">
          <Controller
            control={control}
            name="require_listing_review"
            render={({ field }) => (
              <Switch id="require-review" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <div>
            <Label htmlFor="require-review">
              Require admin review before partner listings go live
            </Label>
            <p className="text-muted-foreground text-sm">
              When on, publishing from a partner dealer moves the listing to “Pending review”. House
              listings are never held.
            </p>
          </div>
        </div>
      </Card>

      <div className="bg-background/90 sticky bottom-0 -mx-4 border-t px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <Button type="submit" disabled={pending || !formState.isDirty}>
          {pending ? <Loader2 className="animate-spin" /> : null} Save settings
        </Button>
      </div>
    </form>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card space-y-4 rounded-xl border p-5 sm:p-6">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
