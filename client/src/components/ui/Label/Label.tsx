import { Label as LabelPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Form label built on Radix `Label`. Associate it with a control via `htmlFor`
 * pointing at the input's `id` (clicking the label then focuses the input), or
 * wrap the control directly. The disabled styles react to a sibling `peer`
 * (`peer-disabled:`) or an ancestor `group` marked `data-disabled="true"`, so a
 * disabled field dims its label without extra wiring.
 */
const Label = ({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) => (
  <LabelPrimitive.Root
    data-slot="label"
    className={cn(
      'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      className,
    )}
    {...props}
  />
);

export { Label };
