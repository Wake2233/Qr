'use client';

import { dealerApplicationSchema, type DealerApplicationInput } from '@cp/validators';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, FileUp, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useId, useState, useTransition } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';

import {
  recordDocument,
  requestDocumentUpload,
  submitDealerApplication,
} from '@/app/[locale]/(storefront)/sell-with-us/actions';
import { Field } from '@/components/dashboard/form-fields';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, MAX_DOCUMENTS } from '@/lib/documents';
import { env } from '@/lib/env';
import { uploadWithProgress } from '@/lib/images';

type Values = DealerApplicationInput;
type TextField = Exclude<keyof Values, 'description'>;

const TEXT_FIELDS: {
  name: TextField;
  autoComplete?: string;
  type?: string;
  span?: boolean;
  placeholder?: string;
}[] = [
  { name: 'display_name', autoComplete: 'organization', span: true },
  { name: 'legal_name', span: true },
  {
    name: 'phone_e164',
    autoComplete: 'tel',
    type: 'tel',
    placeholder: '(908) 555-0142',
  },
  {
    name: 'whatsapp_e164',
    type: 'tel',
    placeholder: 'whatsapp',
  },
  { name: 'email', autoComplete: 'email', type: 'email' },
  {
    name: 'website',
    autoComplete: 'url',
    placeholder: 'yourdealership.com',
  },
  { name: 'address_line1', autoComplete: 'address-line1', span: true },
  { name: 'city', autoComplete: 'address-level2' },
  { name: 'state', autoComplete: 'address-level1', placeholder: 'NJ' },
  { name: 'postal_code', autoComplete: 'postal-code' },
  { name: 'license_number' },
];

export function DealerApplicationForm({ email }: { email: string | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [done, setDone] = useState<{ failedDocs: string[] } | null>(null);
  const filesId = useId();
  const t = useTranslations('SellWithUs');

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
    if (rejected.length) setError(t('documentsInvalid'));
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
        setProgress(t('uploading', { name: file.name, n: index + 1, total: files.length }));
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
        <h2 className="font-display text-2xl font-semibold">{t('receivedTitle')}</h2>
        <p className="text-muted-foreground">{t('receivedBody')}</p>
        {done.failedDocs.length ? (
          <p className="text-warning text-sm">
            {t('uploadFailed', { names: done.failedDocs.join(', ') })}
          </p>
        ) : null}
        <Button asChild>
          <NextLink href="/dashboard/inventory/new">{t('startDraft')}</NextLink>
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
            label={t(`fields.${f.name}`)}
            error={errors[f.name as keyof typeof errors]?.message}
            className={f.span ? 'sm:col-span-2' : undefined}
          >
            {(p) => (
              <Input
                {...p}
                {...form.register(f.name)}
                type={f.type ?? 'text'}
                autoComplete={f.autoComplete}
                placeholder={
                  f.placeholder === 'whatsapp' ? t('whatsappPlaceholder') : f.placeholder
                }
              />
            )}
          </Field>
        ))}
        <Field label={t('about')} error={errors.description?.message} className="sm:col-span-2">
          {(p) => <Textarea {...p} {...form.register('description')} rows={4} />}
        </Field>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{t('documents')}</p>
          <p className="text-muted-foreground text-sm">{t('documentsHelp')}</p>
        </div>
        <label
          htmlFor={filesId}
          className="hover:bg-muted/50 focus-within:ring-ring flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm focus-within:ring-2"
        >
          <FileUp className="text-muted-foreground size-5" />
          {t('chooseFiles')}
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
                  aria-label={t('removeFile', { name: file.name })}
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
          {pending ? <Loader2 className="animate-spin" /> : null} {t('submit')}
        </Button>
        {progress ? (
          <span className="text-muted-foreground text-sm" aria-live="polite">
            {progress}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">{t('consent')}</p>
    </form>
  );
}
