'use client';

import type { Enums } from '@cp/types';
import { Ban, Check, Loader2, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { moderateDealerAction } from '@/app/dashboard/dealers/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Action = 'approve' | 'reject' | 'suspend';

const COPY: Record<
  Exclude<Action, 'approve'>,
  { title: string; description: string; cta: string }
> = {
  reject: {
    title: 'Reject application',
    description: 'The applicant sees this reason on the Sell with us page and can apply again.',
    cta: 'Reject',
  },
  suspend: {
    title: 'Suspend dealer',
    description:
      'All of this dealer’s listings disappear from the storefront immediately. Approve again to reinstate.',
    cta: 'Suspend',
  },
};

export function ModerationButtons({
  dealerId,
  dealerName,
  status,
  isHouse,
}: {
  dealerId: string;
  dealerName: string;
  status: Enums<'dealer_status'>;
  isHouse: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Exclude<Action, 'approve'> | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = (action: Action, why?: string) =>
    startTransition(async () => {
      const result = await moderateDealerAction(
        action === 'approve'
          ? { action, dealer_id: dealerId }
          : { action, dealer_id: dealerId, reason: why },
      );
      if (!result.ok) {
        setError(result.error);
        if (action === 'approve') toast.error(result.error);
        return;
      }
      toast.success(
        action === 'approve'
          ? `${dealerName} approved. Their team can publish now.`
          : action === 'reject'
            ? `${dealerName} rejected.`
            : `${dealerName} suspended. Listings are hidden.`,
      );
      setDialog(null);
      setReason('');
    });

  if (isHouse) {
    return (
      <p className="text-muted-foreground text-sm">The house dealership is always approved.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'approved' ? (
        <Button onClick={() => run('approve')} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
          {status === 'suspended' ? 'Reinstate' : 'Approve'}
        </Button>
      ) : null}
      {status === 'pending' ? (
        <Button variant="outline" onClick={() => setDialog('reject')} disabled={pending}>
          <X /> Reject
        </Button>
      ) : null}
      {status === 'approved' ? (
        <Button variant="destructive" onClick={() => setDialog('suspend')} disabled={pending}>
          <Ban /> Suspend
        </Button>
      ) : null}

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        {dialog ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {COPY[dialog].title}: {dealerName}
              </DialogTitle>
              <DialogDescription>{COPY[dialog].description}</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                run(dialog, reason);
              }}
            >
              <Label htmlFor="moderation-reason">Reason</Label>
              <Textarea
                id="moderation-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                required
                minLength={3}
                maxLength={1000}
                aria-invalid={error ? true : undefined}
              />
              {error ? <p className="text-destructive text-sm">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" /> : null}
                  {COPY[dialog].cta}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
