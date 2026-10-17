'use client';

import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

/** Native share sheet where available (mobile browsers), otherwise copies the link. */
export function ShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  const t = useTranslations('Vehicle');
  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('linkCopied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };
  return (
    <Button type="button" variant="outline" onClick={() => void share()}>
      <Share2 /> {t('share')}
    </Button>
  );
}
