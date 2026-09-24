// Public surface of the design system. It grows only when a screen pulls a component across
// (spec D3 — the player decides what gets built). The full barrel over every ui/ component is
// Phase 2 (design-system rename) work.
export { Button, buttonVariants } from './components/ui/Button/Button';
export type { ButtonProps } from './components/ui/Button/Button';

// Pulled across by the v0 player:
// - Skeleton covers the notation area until the engine + Bravura have arrived.
// - Toaster/toast carry the unsupported-file, engine-failure and settings-reset messages.
export { Skeleton, SkeletonTable, SkeletonForm } from './components/ui/Skeleton/Skeleton';
export { Toaster, toast } from './components/ui/Sonner/Sonner';
// - Card/CardContent frame the empty state's drop target.
export { Card, CardContent } from './components/ui/Card/Card';
// - Tooltip carries the open score's file name behind its title in the player header.
export { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/Tooltip/Tooltip';

// Pulled across by the v0 transport:
// - Slider is the single-value rail the scrubber, the settings rows and per-track volume all use.
// - Progress is the soundfont download bar.
// - Scrubber, TransportToggle and TempoControl are the transport itself.
export { Slider } from './components/ui/Slider/Slider';
export { Progress } from './components/ui/Progress/Progress';
export { Scrubber } from './components/ui/Scrubber/Scrubber';
export { TransportToggle } from './components/ui/TransportToggle/TransportToggle';
export { TempoControl } from './components/ui/TempoControl/TempoControl';
export { Separator } from './components/ui/Separator/Separator';

// Pulled across by the v0 popovers:
// - Accordion holds the settings groups; SettingRow and TrackRow are the rows inside each popover.
// - Popover and ScrollArea are the two popover shells. Both were built for the catalog.
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './components/ui/Accordion/Accordion';
export { SettingRow } from './components/ui/SettingRow/SettingRow';
export type { SettingControl, SettingValue } from './components/ui/SettingRow/SettingRow';
export { TrackRow } from './components/ui/TrackRow/TrackRow';
export type { StaffToggleKey, TrackStaffState } from './components/ui/TrackRow/TrackRow';
export { MIXER_BUTTON_CLASS } from './components/ui/TrackRow/MixerClasses';
// The one "file plays its own recording" reason string — imported by both popovers, the mixer
// and their tests, never re-declared.
export { RECORDING } from './components/ui/TrackRow/TrackRow';
export { MasterRow } from './components/ui/MasterRow/MasterRow';
export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from './components/ui/Popover/Popover';
export { ScrollArea } from './components/ui/ScrollArea/ScrollArea';
