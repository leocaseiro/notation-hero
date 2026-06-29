import type { CatalogRow } from '@/components/catalog/CatalogRow';
import { Cover } from '@/components/ui/Cover/Cover';
import { Flags } from '@/components/ui/Flags/Flags';
import { KindBadge } from '@/components/ui/KindBadge/KindBadge';
import { NewPill } from '@/components/ui/NewPill/NewPill';

interface NameCellProps {
  row: CatalogRow;
}

// Default cover glyph per kind, used when a row has no explicit `icon`. A lesson always
// reads as `school` (and carries the lesson tint), regardless of its kind.
const KIND_ICON: Record<CatalogRow['kind'], string> = {
  song: 'music_note',
  beat: 'graphic_eq',
  rudiment: 'drag_indicator',
  fill: 'bolt',
};

const coverIcon = (row: CatalogRow): string =>
  row.icon ?? (row.isLesson ? 'school' : KIND_ICON[row.kind]);

export const NameCell = ({ row }: Readonly<NameCellProps>) => (
  <div data-slot="name-cell" className="flex min-w-0 items-center gap-3 text-left">
    <Cover icon={coverIcon(row)} variant={row.isLesson ? 'lesson' : 'song'} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        {/* native title: the full text on hover when truncated; screen readers already get
            the full text from the DOM node (truncation is visual-only), so no extra markup */}
        <span title={row.title} className="truncate font-semibold text-foreground">
          {row.title}
        </span>
        {/* song-first ternary (avoids unicorn/no-negated-condition); the else branch narrows
            kind to the non-song union so KindBadge gets a valid 'beat' | 'rudiment' | 'fill' */}
        {row.kind === 'song' ? null : <KindBadge kind={row.kind} />}
        {row.isNew ? <NewPill /> : null}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span title={row.subtitle} className="truncate">
          {row.subtitle}
        </span>
        {/* spread the flags object: exactOptionalPropertyTypes forbids passing an explicit
            `undefined` to Flags' optional boolean props, so omit absent keys entirely */}
        <Flags {...row.flags} />
      </div>
    </div>
  </div>
);
