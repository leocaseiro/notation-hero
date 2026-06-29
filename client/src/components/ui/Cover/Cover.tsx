import { cn } from '@/lib/utils';

interface CoverProps {
  icon?: string;
  variant?: 'song' | 'lesson';
}

export const Cover = ({ icon = 'music_note', variant = 'song' }: Readonly<CoverProps>) => (
  <span
    data-slot="cover"
    data-variant={variant}
    aria-hidden="true"
    className={cn(
      'inline-grid size-10 place-items-center rounded-lg',
      variant === 'lesson'
        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' // lessons: blue tint (functional, not brand)
        : 'bg-primary/15 text-primary', // songs: teal accent tint
    )}
  >
    <span className="material-symbols-outlined">{icon}</span>
  </span>
);
