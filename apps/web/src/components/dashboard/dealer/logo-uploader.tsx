'use client';

import { ImageUp, Loader2, Store } from 'lucide-react';
import Image from 'next/image';
import { useId, useTransition } from 'react';
import { toast } from 'sonner';

import { requestLogoUpload, saveDealerLogo } from '@/app/dashboard/dealer/actions';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';
import { prepareImage, uploadWithProgress } from '@/lib/images';

export function LogoUploader({
  dealerId,
  dealerName,
  logoUrl,
}: {
  dealerId: string;
  dealerName: string;
  logoUrl: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const inputId = useId();

  const upload = (file: File) =>
    startTransition(async () => {
      try {
        const image = await prepareImage(file);
        const target = await requestLogoUpload(dealerId, image.extension);
        if (!target.ok) throw new Error(target.error);
        await uploadWithProgress(
          target.data.signedUrl,
          image.blob,
          image.contentType,
          env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          () => {},
        );
        const saved = await saveDealerLogo(dealerId, target.data.path);
        if (!saved.ok) throw new Error(saved.error);
        toast.success('Logo updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not upload the logo');
      }
    });

  return (
    <div className="flex items-center gap-4">
      <div className="bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${dealerName} logo`}
            fill
            sizes="80px"
            className="object-contain p-1"
          />
        ) : (
          <Store className="text-muted-foreground size-8" />
        )}
      </div>
      <div className="space-y-1">
        <Button asChild variant="outline" size="sm" disabled={pending}>
          <label htmlFor={inputId} className="cursor-pointer">
            {pending ? <Loader2 className="animate-spin" /> : <ImageUp />}{' '}
            {logoUrl ? 'Replace logo' : 'Upload logo'}
          </label>
        </Button>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
            event.target.value = '';
          }}
        />
        <p className="text-muted-foreground text-xs">Square PNG or JPEG works best.</p>
      </div>
    </div>
  );
}
