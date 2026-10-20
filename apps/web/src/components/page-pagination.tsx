import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type PagePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/** Previous / "Page x of y" / Next, driven by the server's `{ page, pageSize, total }`. */
export function PagePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PagePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  const go =
    (target: number, disabled: boolean) => (event: React.MouseEvent) => {
      event.preventDefault();
      if (!disabled) onPageChange(target);
    };

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {first}-{last} of {total}
      </p>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={atStart}
              className={atStart ? 'pointer-events-none opacity-50' : undefined}
              onClick={go(page - 1, atStart)}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="px-3 text-sm">
              Page {page} of {pageCount}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={atEnd}
              className={atEnd ? 'pointer-events-none opacity-50' : undefined}
              onClick={go(page + 1, atEnd)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
