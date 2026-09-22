import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Separator — shadcn/ui port over Base UI (migrated from Radix). A thin divider that flips
// between a full-width horizontal rule and a full-height vertical rule via `orientation`.
// Radix's `decorative` prop is gone: Base UI always renders a semantic `role="separator"` with
// `aria-orientation`, so assistive tech perceives the divider. The line follows the Button
// `outline` border palette (border light / input dark); override via className when a surface
// needs a different weight.
const Separator = ({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) => (
  <SeparatorPrimitive
    data-slot="separator"
    orientation={orientation}
    className={cn(
      'bg-border dark:bg-input shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
      className,
    )}
    {...props}
  />
);

export { Separator };
