import type { CatalogRow } from '@/components/catalog/CatalogRow';
import { Cover } from '@/components/ui/Cover/Cover';
import { Flags } from '@/components/ui/Flags/Flags';
import { KindBadge } from '@/components/ui/KindBadge/KindBadge';
import { NewPill } from '@/components/ui/NewPill/NewPill';

interface NameCellProps {
  row: CatalogRow;
}

export const NameCell = ({ row }: Readonly<NameCellProps>) => (
  <div data-slot="name-cell" className="flex min-w-0 items-center gap-3 text-left">
    {/* conditional spread for icon: exactOptionalPropertyTypes forbids passing undefined,
        and Cover's own default ('music_note') applies when icon is omitted */}
    <Cover {...(row.icon ? { icon: row.icon } : {})} variant={row.isLesson ? 'lesson' : 'song'} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate font-semibold text-foreground">{row.title}</span>
        {/* song-first ternary (avoids unicorn/no-negated-condition); the else branch narrows
            kind to the non-song union so KindBadge gets a valid 'beat' | 'rudiment' | 'fill' */}
        {row.kind === 'song' ? null : <KindBadge kind={row.kind} />}
        {row.isNew ? <NewPill /> : null}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate">{row.subtitle}</span>
        {/* spread the flags object: exactOptionalPropertyTypes forbids passing an explicit
            `undefined` to Flags' optional boolean props, so omit absent keys entirely */}
        <Flags {...row.flags} />
      </div>
    </div>
  </div>
);
