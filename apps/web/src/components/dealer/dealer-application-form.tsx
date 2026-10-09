'use client';

import { dealerApplicationSchema, type DealerApplicationInput } from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, FileUp, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, useTransition } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';

import {
  recordDocument,
  requestDocumentUpload,
  submitDealerApplication,
} from '@/app/(storefront)/sell-with-us/actions';
import { Field } from '@/components/dashboard/form-fields';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, MAX_DOCUMENTS } from '@/lib/documents';
import { env } from '@/lib/env';
import { uploadWithProgress } from '@/lib/images';

type Values = DealerApplicationInput;

const TEXT_FIELDS: {
  name: FieldPath<Values>;
  label: string;
  autoComplete?: string;
  type?: string;
  span?: boolean;
  placeholder?: string;
}[] = [
  { name: 'display_name', label: 'Dealership name', autoComplete: 'organization', span: true },
  { name: 'legal_name', label: 'Legal business name (optional)', span: true },
  {
    name: 'phone_e164',
    label: 'Phone',
    autoComplete: 'tel',
    type: 'tel',
    placeholder: '(908) 555-0142',
  },
  {
    name: 'whatsapp_e164',
    label: 'WhatsApp number',
    type: 'tel',
    placeholder: 'Buyers message this number',
  },
  { name: 'email', label: 'Business email', autoComplete: 'email', type: 'email' },
  {
    name: 'website',
    label: 'Website (optional)',
    autoComplete: 'url',
    placeholder: 'yourdealership.com',
  },
  { name: 'address_line1', label: 'Street address', autoComplete: 'address-line1', span: true },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'state', label: 'State', autoComplete: 'address-level1', placeholder: 'NJ' },
  { name: 'postal_code', label: 'ZIP code', autoComplete: 'postal-code' },
  { name: 'license_number', label: 'Dealer license number' },
];

export function DealerApplicationForm({ email }: { email: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<{ failedDocs: string[] } | null>(null);
  const filesId = useId();

  const form = useForm<Values>({
    resolver: zodResolver(dealerApplicationSchema),
    defaultValues: {
      display_name: '',
      phone_e164: '',
      whatsapp_e164: '',
      email: email ?? '',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      license_number: '',
    },
    mode: 'onTouched',
  });
  const errors = form.formState.errors;

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const rejected = picked.filter(
      (f) => !(DOCUMENT_TYPES as readonly string[]).includes(f.type) || f.size > MAX_DOCUMENT_BYTES,
    );
    if (rejected.length) setError('Documents must be PDF, JPEG or PNG files up to 20 MB.');
    setFiles((prev) =>
      [...prev, ...picked.filter((f) => !rejected.includes(f))].slice(0, MAX_DOCUMENTS),
    );
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await submitDealerApplication(values);
      if (!result.ok) {
        setError(result.error);
        for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
          form.setError(field as FieldPath<Values>, { message: messages[0] });
        }
        return;
      }
      const { dealerId } = result.data;
      const failedDocs: string[] = [];
      for (const [index, file] of files.entries()) {
        setProgress(`Uploading ${file.name} (${index + 1}/${files.length})…`);
        const target = await requestDocumentUpload({
          dealerId,
          fileId: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
        });
        if (!target.ok) {
          failedDocs.push(file.name);
          continue;
        }
        try {
          await uploadWithProgress(
            target.data.signedUrl,
            file,
            file.type,
            env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
            () => {},
          );
          const recorded = await recordDocument({
            dealerId,
            path: target.data.path,
            name: file.name,
            size: file.size,
          });
          if (!recorded.ok) failedDocs.push(file.name);
        } catch {
          failedDocs.push(file.name);
        }
      }
      setProgress(null);
      setDone({ failedDocs });
    });
  });

  if (done) {
    return (
      <div className="bg-card space-y-4 rounded-2xl border p-6 sm:p-8" role="status">
        <CheckCircle2 className="text-success size-10" />
        <h2 className="font-display text-2xl font-semibold">Application received</h2>
        <p className="text-muted-foreground">
          We review new dealerships within one business day. In the meantime you can open the
          console and prepare draft listings. They go live as soon as you are approved.
        </p>
        {done.failedDocs.length ? (
          <p className="text-warning text-sm">
            We could not upload {done.failedDocs.join(', ')}. You can send documents later from your
            dealer profile.
          </p>
        ) : null}
        <Button asChild>
          <Link href="/dashboard/inventory/new">Start a draft listing</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="bg-card space-y-6 rounded-2xl border p-6 sm:p-8"
    >
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            error={errors[f.name as keyof typeof errors]?.message}
            className={f.span ? 'sm:col-span-2' : undefined}
          >
            {(p) => (
              <Input
                {...p}
                {...form.register(f.name)}
                type={f.type ?? 'text'}
                autoComplete={f.autoComplete}
                placeholder={f.placeholder}
              />
            )}
          </Field>
        ))}
        <Field
          label="About your dealership (optional)"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          {(p) => <Textarea {...p} {...form.register('description')} rows={4} />}
        </Field>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Supporting documents (optional)</p>
          <p className="text-muted-foreground text-sm">
            Dealer license, insurance or business registration. PDF, JPEG or PNG, up to 20 MB each.
            Only our review team can see them.
          </p>
        </div>
        <label
          htmlFor={filesId}
          className="hover:bg-muted/50 focus-within:ring-ring flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm focus-within:ring-2"
        >
          <FileUp className="text-muted-foreground size-5" />
          Choose files
          <input
            id={filesId}
            type="file"
            multiple
            accept={DOCUMENT_TYPES.join(',')}
            className="sr-only"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        {files.length ? (
          <ul className="space-y-1 text-sm">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null} Submit application
        </Button>
        {progress ? (
          <span className="text-muted-foreground text-sm" aria-live="polite">
            {progress}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        By applying you confirm you are authorized to sell vehicles on behalf of this business.
      </p>
    </form>
  );
}
