/** Decorative topographic contour lines: a subtle environmental motif. Purely visual. */
export function ContourBackdrop({ className }: { className?: string }) {
  const rings = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg viewBox="0 0 600 600" className={className} aria-hidden fill="none">
      {rings.map((i) => {
        const r = 40 + i * 34;
        const wobble = 10 + i * 2;
        return (
          <path
            key={i}
            d={`M ${300 - r} 300 C ${300 - r} ${300 - r - wobble}, ${300 + r * 0.4} ${300 - r - wobble * 2}, ${300 + r} ${300 - wobble} S ${300 + r * 0.6} ${300 + r + wobble}, ${300 - r * 0.2} ${300 + r} S ${300 - r} ${300 + r * 0.5}, ${300 - r} 300 Z`}
            stroke="#82d2a2"
            strokeOpacity={0.55 - i * 0.045}
            strokeWidth={1.25}
          />
        );
      })}
    </svg>
  );
}
