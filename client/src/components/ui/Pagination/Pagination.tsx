import { cn } from '@/lib/utils';

interface PaginationProps {
  /** Zero-based current page. */
  pageIndex: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  /** Pages shown on each side of the current page. */
  siblingCount?: number;
  /** Current page size; required to show the page-size selector. */
  pageSize?: number;
  /** Fires with the chosen size. Omit to hide the page-size selector. */
  onPageSizeChange?: (size: number) => void;
  /** Options for the page-size selector. */
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
  className?: string;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type PageItem = number | 'ellipsis';

// Base styling for a square 36px control (Prev/Next + each numbered page). Bordered, hover:bg-muted,
// a focus ring, and disabled = dimmed + non-interactive — mirrors Button's `outline` variant.
const CONTROL_CLASSES = cn(
  'inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-sm',
  'shadow-xs hover:bg-muted hover:text-foreground',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
  'disabled:pointer-events-none disabled:opacity-50',
);

// The current page reads as a solid teal chip (same tokens as Button's default variant), so it is
// unmistakable — not a faint tint. It has no hover shift because it is not a target to move to.
const ACTIVE_PAGE_CLASSES = cn(
  'inline-flex size-9 items-center justify-center rounded-md border border-transparent text-sm font-medium',
  'bg-primary text-primary-foreground',
  'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
);

// True when a zero-based page must be shown: the first page, the last page, or within
// `siblingCount` of the current page. Single-return so sonarjs stays happy.
function isVisiblePage(
  page: number,
  pageIndex: number,
  lastPage: number,
  siblingCount: number,
): boolean {
  return page === 0 || page === lastPage || Math.abs(page - pageIndex) <= siblingCount;
}

// Build the sequence of page numbers (zero-based) and ellipsis gaps to render. Walks pages in
// ascending order (so no sort is needed) keeping the first page, the last page, and the window
// `current ± siblingCount`; a single 'ellipsis' marker is inserted wherever consecutive kept pages
// skip a number. Flat + branch-light.
function buildPageItems(pageIndex: number, pageCount: number, siblingCount: number): PageItem[] {
  const lastPage = pageCount - 1;
  const items: PageItem[] = [];
  let previousKept = -1;
  for (let page = 0; page <= lastPage; page += 1) {
    if (!isVisiblePage(page, pageIndex, lastPage, siblingCount)) {
      continue;
    }
    if (page - previousKept > 1) {
      items.push('ellipsis');
    }
    items.push(page);
    previousKept = page;
  }
  return items;
}

// Dumb, controlled pager: page position in, page/size changes out. It knows nothing about TanStack
// Table — a container maps the table's pagination model to these primitive props. Numbered pages
// with ellipsis gaps; Previous is disabled on the first page, Next on the last, and everything is
// disabled when `disabled` or there is a single page (or none).
const Pagination = ({
  pageIndex,
  pageCount,
  onPageChange,
  siblingCount = 1,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  disabled = false,
  className,
}: PaginationProps) => {
  const lastPageIndex = Math.max(pageCount - 1, 0);
  const noPaging = disabled || pageCount <= 1;
  const atFirst = noPaging || pageIndex <= 0;
  const atLast = noPaging || pageIndex >= lastPageIndex;
  const items = buildPageItems(pageIndex, Math.max(pageCount, 1), siblingCount);

  return (
    <nav
      data-slot="pagination"
      aria-label="Pagination"
      className={cn('flex items-center gap-1.5 text-sm', className)}
    >
      <button
        type="button"
        data-slot="pagination-previous"
        aria-label="Previous page"
        disabled={atFirst}
        onClick={() => onPageChange(pageIndex - 1)}
        className={CONTROL_CLASSES}
      >
        <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
          chevron_left
        </span>
      </button>

      {items.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            // eslint-disable-next-line react/no-array-index-key -- positional gap marker, no stable id
            key={`ellipsis-${index}`}
            data-slot="pagination-ellipsis"
            role="presentation"
            className="inline-flex size-9 items-center justify-center text-muted-foreground"
          >
            <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
              more_horiz
            </span>
            <span className="sr-only">More pages</span>
          </span>
        ) : (
          <button
            key={item}
            type="button"
            data-slot="pagination-page"
            aria-label={`Go to page ${item + 1}`}
            aria-current={item === pageIndex ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onPageChange(item)}
            className={item === pageIndex ? ACTIVE_PAGE_CLASSES : CONTROL_CLASSES}
          >
            {item + 1}
          </button>
        ),
      )}

      <button
        type="button"
        data-slot="pagination-next"
        aria-label="Next page"
        disabled={atLast}
        onClick={() => onPageChange(pageIndex + 1)}
        className={CONTROL_CLASSES}
      >
        <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
          chevron_right
        </span>
      </button>

      {onPageSizeChange && (
        <label className="ml-2 flex items-center gap-1.5 text-muted-foreground">
          <span className="sr-only">Rows per page</span>
          <select
            data-slot="pagination-page-size"
            value={pageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className={cn(
              'h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground',
              'shadow-xs hover:bg-muted',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
};

export { Pagination };
