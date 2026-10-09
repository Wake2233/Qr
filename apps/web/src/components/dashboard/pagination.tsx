import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/** Server-rendered pager that preserves the current query string. */
export function Pagination({
  page,
  pageCount,
  total,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const href = (target: number) => {
    const query = new URLSearchParams(
      Object.entries({ ...params, page: target > 1 ? String(target) : undefined }).filter(
        (entry): entry is [string, string] => Boolean(entry[1]),
      ),
    ).toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  return (
    <nav className="flex items-center justify-between gap-4 text-sm" aria-label="Pagination">
      <p className="text-muted-foreground">
        {total} result{total === 1 ? '' : 's'} · page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page - 1)}>
              <ChevronLeft /> Previous
            </Link>
          </Button>
        ) : null}
        {page < pageCount ? (
          <Button asChild variant="outline" size="sm">
            <Link href={href(page + 1)}>
              Next <ChevronRight />
            </Link>
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
