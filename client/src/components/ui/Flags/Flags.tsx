import { cn } from '@/lib/utils';

interface FlagsProps {
  audio?: boolean;
  video?: boolean;
  parts?: boolean;
}

type Flag = 'audio' | 'video' | 'parts';

const ICON: Record<Flag, string> = { audio: 'volume_up', video: 'videocam', parts: 'account_tree' };

// Compose one spoken label across the set flags: "Has audio", "Has audio and video",
// "Has audio, video and parts". Extracted so the JSX stays index-access-free
// (noUncheckedIndexedAccess) — Array.join handles the 1/2/3-flag shapes generically.
function composeLabel(active: Flag[]): string {
  if (active.length === 1) {
    return `Has ${active.join('')}`;
  }
  const head = active.slice(0, -1).join(', ');
  const tail = active.slice(-1).join('');
  return `Has ${head} and ${tail}`;
}

export const Flags = ({ audio, video, parts }: Readonly<FlagsProps>) => {
  const active: Flag[] = [];
  if (audio) {
    active.push('audio');
  }
  if (video) {
    active.push('video');
  }
  if (parts) {
    active.push('parts');
  }

  // No flags set → render nothing (the cell is simply empty for that row).
  if (active.length === 0) {
    return null;
  }

  return (
    <span
      data-slot="flags"
      role="img"
      aria-label={composeLabel(active)}
      className="inline-flex items-center gap-1 text-muted-foreground"
    >
      {active.map((flag) => (
        <span
          key={flag}
          aria-hidden="true"
          // parts carries playable sub-sections — accent it (teal) to set it apart from
          // the neutral audio/video glyphs. Tokens only, no raw hex.
          className={cn('material-symbols-outlined', flag === 'parts' && 'text-primary')}
          style={{ fontSize: '1rem' }}
        >
          {ICON[flag]}
        </span>
      ))}
    </span>
  );
};
