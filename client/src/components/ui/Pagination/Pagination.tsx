import { cn } from '@/lib/utils';

interface PaginationProps {
  /** Zero-based current page. */
  pageIndex: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
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

// Shared icon-button styling — mirrors FacetFilter's trigger: bordered, hover:bg-muted, a focus
// ring, and disabled = dimmed + non-interactive. size-9 square so the glyph sits centred.
const NAV_BUTTON_CLASSES = cn(
  'inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-sm',
  'shadow-xs hover:bg-muted',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
  'disabled:pointer-events-none disabled:opacity-50',
);

// Dumb, controlled pager: page position in, page/size changes out. It knows nothing about
// TanStack Table — a container maps the table's pagination model to these primitive props. First
// and Previous are disabled on the first page; Next and Last on the last; everything is disabled
// when `disabled` or there is a single page (or none).
const Pagination = ({
  pageIndex,
  pageCount,
  onPageChange,
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

  return (
    <nav
      data-slot="pagination"
      aria-label="Pagination"
      className={cn('flex items-center gap-1.5 text-sm', className)}
    >
      <button
        type="button"
        data-slot="pagination-first"
        aria-label="First page"
        disabled={atFirst}
        onClick={() => onPageChange(0)}
        className={NAV_BUTTON_CLASSES}
      >
        <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
          first_page
        </span>
      </button>
      <button
        type="button"
        data-slot="pagination-previous"
        aria-label="Previous page"
        disabled={atFirst}
        onClick={() => onPageChange(pageIndex - 1)}
        className={NAV_BUTTON_CLASSES}
      >
        <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
          chevron_left
        </span>
      </button>

      <span aria-live="polite" className="px-2 text-muted-foreground">
        Page {pageIndex + 1} of {Math.max(pageCount, 1)}
      </span>

      <button
        type="button"
        data-slot="pagination-next"
        aria-label="Next page"
        disabled={atLast}
        onClick={() => onPageChange(pageIndex + 1)}
        className={NAV_BUTTON_CLASSES}
      >
        <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
          chevron_right
        </span>
      </button>
      <button
        type="button"
        data-slot="pagination-last"
        aria-label="Last page"
        disabled={atLast}
        onClick={() => onPageChange(lastPageIndex)}
        className={NAV_BUTTON_CLASSES}
      >
        <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
          last_page
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
