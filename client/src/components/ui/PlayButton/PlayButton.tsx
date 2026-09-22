import { Button } from '@/components/ui/Button/Button';

interface PlayButtonProps {
  title: string;
  onClick?: () => void;
}

export const PlayButton = ({ title, onClick }: Readonly<PlayButtonProps>) => (
  <Button
    size="icon"
    variant="ghost"
    aria-label={`Play ${title}`}
    // 44x44 hit area (WCAG 2.5.5) even though the visible play_circle glyph is ~34px.
    className="size-11 rounded-full text-primary"
    onClick={(event) => {
      event.stopPropagation(); // a play tap must not also trigger the row's onRowClick
      onClick?.();
    }}
  >
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 34 }}>
      play_circle
    </span>
  </Button>
);
