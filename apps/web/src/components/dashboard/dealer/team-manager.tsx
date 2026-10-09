'use client';

import type { TeamMember } from '@cp/api';
import { Constants, type Enums } from '@cp/types';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { addTeamMember, changeMemberRole, removeTeamMember } from '@/app/dashboard/dealer/actions';
import { OptionSelect } from '@/components/dashboard/form-fields';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Role = Enums<'dealer_member_role'>;
const ROLE_LABELS: Record<Role, string> = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };

export function TeamManager({
  dealerId,
  team,
  currentUserId,
  canAddOwners,
}: {
  dealerId: string;
  team: TeamMember[];
  currentUserId: string;
  /** Owners and admins can grant ownership; managers can't. */
  canAddOwners: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [error, setError] = useState<string | null>(null);
  const roles = Constants.public.Enums.dealer_member_role
    .filter((r) => canAddOwners || r !== 'owner')
    .map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  const add = () =>
    startTransition(async () => {
      setError(null);
      const result = await addTeamMember({ dealer_id: dealerId, email, role });
      if (!result.ok) {
        setError(result.fieldErrors?.email?.[0] ?? result.error);
        return;
      }
      toast.success(`${email} added as ${ROLE_LABELS[role].toLowerCase()}`);
      setEmail('');
    });

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-lg border">
        {team.map((member) => {
          const self = member.user_id === currentUserId;
          const editable = !self && (canAddOwners || member.role !== 'owner');
          return (
            <li key={member.user_id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {member.full_name ?? member.email}
                  {self ? <span className="text-muted-foreground font-normal"> (you)</span> : null}
                </p>
                <p className="text-muted-foreground truncate text-sm">{member.email}</p>
              </div>
              {editable ? (
                <div className="w-36">
                  <OptionSelect
                    id={`role-${member.user_id}`}
                    allowNone={false}
                    value={member.role}
                    options={roles}
                    disabled={pending}
                    onChange={(next) => {
                      if (!next) return;
                      startTransition(async () => {
                        const result = await changeMemberRole({
                          dealerId,
                          userId: member.user_id,
                          role: next,
                        });
                        if (result.ok) toast.success('Role updated');
                        else toast.error(result.error);
                      });
                    }}
                  />
                </div>
              ) : (
                <span className="text-muted-foreground w-36 text-sm">
                  {ROLE_LABELS[member.role]}
                </span>
              )}
              {editable ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${member.email}`}
                      disabled={pending}
                    >
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {member.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        They lose access to this dealership’s inventory and leads right away.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          startTransition(async () => {
                            const result = await removeTeamMember({
                              dealerId,
                              userId: member.user_id,
                            });
                            if (result.ok) toast.success('Member removed');
                            else toast.error(result.error);
                          })
                        }
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span className="size-9" />
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Label htmlFor="invite-email">Add a team member</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@dealership.com"
            className="min-w-56 flex-1"
            aria-invalid={error ? true : undefined}
            aria-describedby="invite-help"
            required
          />
          <div className="w-36">
            <OptionSelect
              id="invite-role"
              allowNone={false}
              value={role}
              options={roles}
              onChange={(next) => next && setRole(next)}
            />
          </div>
          <Button type="submit" disabled={pending || !email}>
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Add
          </Button>
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : (
          <p id="invite-help" className="text-muted-foreground text-xs">
            They need an account first: ask them to sign in once at this site with that email.
          </p>
        )}
      </form>
    </div>
  );
}
