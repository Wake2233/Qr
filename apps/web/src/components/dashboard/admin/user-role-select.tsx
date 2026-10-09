'use client';

import type { Enums } from '@cp/types';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { changeUserRole } from '@/app/dashboard/users/actions';
import { OptionSelect } from '@/components/dashboard/form-fields';

const ROLES = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'admin', label: 'Admin' },
] as const satisfies { value: Enums<'app_role'>; label: string }[];

export function UserRoleSelect({
  userId,
  email,
  role,
  self,
}: {
  userId: string;
  email: string;
  role: Enums<'app_role'>;
  self: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="w-32">
      <OptionSelect
        id={`role-${userId}`}
        aria-describedby={undefined}
        allowNone={false}
        value={role}
        options={ROLES}
        disabled={pending || self}
        onChange={(next) => {
          if (!next) return;
          startTransition(async () => {
            const result = await changeUserRole({ userId, role: next });
            if (result.ok)
              toast.success(`${email} is now ${next === 'admin' ? 'an admin' : `a ${next}`}`);
            else toast.error(result.error);
          });
        }}
      />
    </div>
  );
}
