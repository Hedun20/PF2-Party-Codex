const SHAPES = {
  4: (
    <>
      <path className="dice-icon__facet" d="M32 4 59 56H5Z" />
      <path className="dice-icon__detail" d="m32 4-11 36h22ZM5 56l16-16m38 16L43 40" />
    </>
  ),
  6: (
    <>
      <path className="dice-icon__facet" d="M32 4 57 18v28L32 60 7 46V18Z" />
      <path className="dice-icon__detail" d="M7 18l25 14 25-14M32 32v28" />
    </>
  ),
  8: (
    <>
      <path className="dice-icon__facet" d="M32 3 59 32 32 61 5 32Z" />
      <path className="dice-icon__detail" d="M32 3 21 32l11 29m0-58 11 29-11 29M5 32h54" />
    </>
  ),
  10: (
    <>
      <path className="dice-icon__facet" d="M32 3 47 9l10 13 2 16-11 14-16 9-16-9L5 38l2-16L17 9Z" />
      <path className="dice-icon__detail" d="m32 3-8 20 8 38m0-58 8 20-8 38M7 22l17 1L5 38m52-16-17 1 19 15M16 52l16-29 16 29" />
    </>
  ),
  12: (
    <>
      <path className="dice-icon__facet" d="m32 3 16 5 11 13 1 18-11 15-17 7-17-7L4 39l1-18L16 8Z" />
      <path className="dice-icon__detail" d="m32 16 14 10-5 17H23l-5-17ZM16 8l2 18L5 21m43-13-2 18 13-5M4 39l19 4-8 11m45-15-19 4 8 11M32 61V16" />
    </>
  ),
  20: (
    <>
      <path className="dice-icon__facet" d="M32 3 55 16l6 26-16 17H19L3 42l6-26Z" />
      <path className="dice-icon__detail" d="m32 3-13 23 13 20 13-20ZM9 16l10 10-16 16m52-26L45 26l16 16M19 59l13-13 13 13M3 42h58" />
    </>
  ),
  100: (
    <>
      <path className="dice-icon__facet dice-icon__facet--rear" d="m24 5 17 7 7 18-7 19-17 10-17-10-6-19 6-18Z" />
      <path className="dice-icon__detail dice-icon__detail--rear" d="m24 5-8 20 8 34m17-47-9 13 9 24M1 30l15-5-9-13m41 18-16-5M7 49l17-24 17 24" />
      <path className="dice-icon__facet" d="m56 5 17 7 6 18-6 19-17 10-17-10-7-19 7-18Z" />
      <path className="dice-icon__detail" d="m56 5-8 20 8 34m17-47-9 13 9 24M32 30l16-5-9-13m40 18-15-5M39 49l17-24 17 24" />
    </>
  )
};

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function DiceIcon({ sides, size = 48, title = "", className = "", ...props }) {
  const numericSides = Number(sides);
  const isPercentile = numericSides === 100;
  const shape = SHAPES[numericSides] || SHAPES[20];
  const dieName = SHAPES[numericSides] ? `d${numericSides}` : "custom";

  return (
    <svg
      viewBox={isPercentile ? "0 0 80 64" : "0 0 64 64"}
      width={isPercentile ? Math.round(size * 1.25) : size}
      height={size}
      className={classNames("dice-icon", `dice-icon--${dieName}`, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : "true"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {shape}
    </svg>
  );
}
