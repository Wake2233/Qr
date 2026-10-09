'use client';

import { trackContactClick } from '@cp/api';
import { buildTelUrl, buildWhatsAppUrl, formatPhone } from '@cp/core';
import { MessageCircle, Phone } from 'lucide-react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContactActionsProps {
  vehicleId: string;
  whatsappE164: string | null;
  phoneE164: string | null;
  /** prefilled WhatsApp message */
  text: string;
  /** `bar`: compact fixed bottom bar on small screens */
  variant?: 'stack' | 'bar';
  className?: string;
}

/**
 * The conversion point: WhatsApp (prefilled) and Call. Clicks are logged fire-and-forget;
 * the link opens immediately and never waits for the RPC (CLAUDE.md rule 6).
 */
export function ContactActions({
  vehicleId,
  whatsappE164,
  phoneE164,
  text,
  variant = 'stack',
  className,
}: ContactActionsProps) {
  const { supabase } = useAuth();
  if (!whatsappE164 && !phoneE164) return null;
  const bar = variant === 'bar';

  return (
    <div className={cn(bar ? 'grid grid-cols-2 gap-2' : 'grid gap-2', className)}>
      {whatsappE164 ? (
        <Button
          asChild
          size="lg"
          className={cn(
            'bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90 h-12 text-base',
            !phoneE164 && bar && 'col-span-2',
          )}
        >
          <a
            href={buildWhatsAppUrl(whatsappE164, text)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContactClick(supabase, vehicleId, 'whatsapp', 'web')}
            data-testid="cta-whatsapp"
          >
            <MessageCircle className="size-5" /> {bar ? 'WhatsApp' : 'Contact via WhatsApp'}
          </a>
        </Button>
      ) : null}
      {phoneE164 ? (
        <Button
          asChild
          size="lg"
          variant="outline"
          className={cn('h-12 text-base', !whatsappE164 && bar && 'col-span-2')}
        >
          <a
            href={buildTelUrl(phoneE164)}
            onClick={() => trackContactClick(supabase, vehicleId, 'call', 'web')}
            data-testid="cta-call"
          >
            <Phone className="size-5" /> {bar ? 'Call' : `Call ${formatPhone(phoneE164)}`}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
