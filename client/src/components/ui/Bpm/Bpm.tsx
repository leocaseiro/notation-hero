interface BpmProps {
  value: number | string;
}

// Parse a "60→120" ramp into its two endpoints. Returns null for a plain number or any
// string that is not a two-part ramp, so callers branch on one nullable tuple instead of
// index-accessing a split result (noUncheckedIndexedAccess would type each part as
// possibly-undefined).
function parseRange(value: number | string): [string, string] | null {
  if (typeof value !== 'string') {
    return null;
  }
  const [start, end, ...rest] = value.split('→').map((part) => part.trim());
  if (start === undefined || end === undefined || rest.length > 0) {
    return null;
  }
  return [start, end];
}

export const Bpm = ({ value }: Readonly<BpmProps>) => {
  const range = parseRange(value);
  const label = range ? `BPM: ${range[0]} to ${range[1]}` : `BPM: ${value}`;

  return (
    <span data-slot="bpm" role="img" aria-label={label} className="tabular-nums">
      <span aria-hidden="true">
        {range ? (
          <>
            {range[0]}
            <span className="material-symbols-outlined align-middle" style={{ fontSize: '0.9rem' }}>
              arrow_right_alt
            </span>
            {range[1]}
          </>
        ) : (
          value
        )}
      </span>
    </span>
  );
};
