import { Badge } from '@/components/ui/Badge/Badge';
import { cn } from '@/lib/utils';

type Kind = 'beat' | 'rudiment' | 'fill';

interface KindBadgeProps {
  kind: Kind;
}

const LABEL: Record<Kind, string> = { beat: 'Beat', rudiment: 'Rudiment', fill: 'Fill' };

// Outline style (deliberate departure from the mockup's tinted fill). Colours must pass
// axe AA in BOTH themes — darken if axe flags. Beat reuses the brand text tokens
// (brand-700 = AA on white; brand-600 = dark-mode accent text); Fill uses the
// --kind-fill token (added in Step 4) so no raw hex lives in the component.
const COLOR: Record<Kind, string> = {
  beat: 'border-brand-700 text-brand-700 dark:border-brand-600 dark:text-brand-600',
  rudiment: 'border-sky-700 text-sky-700 dark:border-sky-400 dark:text-sky-400',
  fill: 'border-kind-fill text-kind-fill',
};

export const KindBadge = ({ kind }: Readonly<KindBadgeProps>) => (
  <Badge variant="outline" data-slot="kind-badge" className={cn('font-semibold', COLOR[kind])}>
    {LABEL[kind]}
  </Badge>
);
