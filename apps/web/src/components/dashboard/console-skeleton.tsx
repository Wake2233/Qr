import { Skeleton } from '@/components/ui/skeleton';

export function ConsoleSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading console">
      <aside className="bg-sidebar hidden w-64 shrink-0 border-r p-4 lg:block">
        <Skeleton className="mb-8 h-8 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex h-16 items-center border-b px-6">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
