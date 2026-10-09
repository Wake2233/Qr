import { listUsers } from '@cp/api';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UserRoleSelect } from '@/components/dashboard/admin/user-role-select';
import { PageHeader } from '@/components/dashboard/page-header';
import { Pagination } from '@/components/dashboard/pagination';
import { TableSkeleton } from '@/components/dashboard/table-skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { requireAdmin } from '@/lib/console';

export const metadata: Metadata = { title: 'Users' };

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default function UsersPage({ searchParams }: PageProps<'/dashboard/users'>) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Every account. Promote admins here; dealer access comes from dealership membership."
      />
      <Suspense fallback={<TableSkeleton />}>
        <UserDirectory searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function UserDirectory({
  searchParams,
}: {
  searchParams: PageProps<'/dashboard/users'>['searchParams'];
}) {
  const raw = await searchParams;
  const search = first(raw.q)?.slice(0, 100) ?? '';
  const page = Math.max(1, Number.parseInt(first(raw.page) ?? '1', 10) || 1);
  const { supabase, ctx } = await requireAdmin();
  const users = await listUsers(supabase, { search, page });

  return (
    <div className="space-y-4">
      <form className="max-w-sm" role="search">
        <Input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search email or name"
          aria-label="Search users"
        />
      </form>
      <div className="bg-card overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Dealerships</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.items.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <p className="font-medium">{user.full_name ?? user.email}</p>
                  <p className="text-muted-foreground text-xs">{user.email}</p>
                </TableCell>
                <TableCell>
                  <UserRoleSelect
                    userId={user.id}
                    email={user.email}
                    role={user.role}
                    self={user.id === ctx.userId}
                  />
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {user.dealer_count}
                </TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {dateFormat.format(new Date(user.created_at))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={users.page}
        pageCount={users.pageCount}
        total={users.total}
        basePath="/dashboard/users"
        params={{ q: search || undefined }}
      />
    </div>
  );
}
