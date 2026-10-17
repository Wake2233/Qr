'use client';

import type { ConsoleDealer } from '@cp/api';
import { formatPhone } from '@cp/core';
import { dealerProfileSchema, type DealerProfileInput } from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTransition } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { saveDealerProfile } from '@/app/[locale]/dashboard/dealer/actions';
import { Field } from '@/components/dashboard/form-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Values = DealerProfileInput;

const FIELDS: {
  name: keyof Omit<Values, 'description'>;
  label: string;
  type?: string;
  span?: boolean;
}[] = [
  { name: 'display_name', label: 'Dealership name', span: true },
  { name: 'legal_name', label: 'Legal business name', span: true },
  { name: 'phone_e164', label: 'Phone (Call button)', type: 'tel' },
  { name: 'whatsapp_e164', label: 'WhatsApp (message button)', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'website', label: 'Website' },
  { name: 'address_line1', label: 'Street address', span: true },
  { name: 'city', label: 'City' },
  { name: 'state', label: 'State' },
  { name: 'postal_code', label: 'ZIP code' },
];

export function DealerProfileForm({ dealer }: { dealer: ConsoleDealer }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(dealerProfileSchema),
    defaultValues: {
      display_name: dealer.display_name,
      legal_name: dealer.legal_name,
      phone_e164: dealer.phone_e164 ? formatPhone(dealer.phone_e164) : '',
      whatsapp_e164: dealer.whatsapp_e164 ? formatPhone(dealer.whatsapp_e164) : '',
      email: dealer.email ?? '',
      website: dealer.website,
      address_line1: dealer.address_line1 ?? '',
      city: dealer.city ?? '',
      state: dealer.state ?? '',
      postal_code: dealer.postal_code ?? '',
      description: dealer.description,
    },
    mode: 'onTouched',
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveDealerProfile(dealer.id, values);
      if (!result.ok) {
        toast.error(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as FieldPath<Values>, { message: messages[0] });
        }
        return;
      }
      form.reset(values);
      toast.success('Profile saved. Listings show the new details.');
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            error={errors[f.name]?.message}
            className={f.span ? 'sm:col-span-2' : undefined}
          >
            {(p) => <Input {...p} {...form.register(f.name)} type={f.type ?? 'text'} />}
          </Field>
        ))}
        <Field label="About" error={errors.description?.message} className="sm:col-span-2">
          {(p) => <Textarea {...p} {...form.register('description')} rows={4} />}
        </Field>
      </div>
      <Button type="submit" disabled={pending || !form.formState.isDirty}>
        {pending ? <Loader2 className="animate-spin" /> : null} Save profile
      </Button>
    </form>
  );
}
