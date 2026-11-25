/**
 * Kovenra brand mark: a ticket stub that forms a K, with the check mark cut out of it.
 * Vector redraw of the approved logo so it stays crisp from 16px to billboard size.
 */
export const MARK_PATH =
  "M255 420Q255 335 340 335L540 335Q568 335 568 362L568 530L790 340L1012 338Q1026 343 1015 351L575 660Q567 666 559 658L490 587Q478 577 465 587L418 627Q410 636 418 645L545 768Q556 777 568 768L915 482Q933 474 925 491L846 592Q834 611 846 628L1028 821Q1041 850 1012 852L760 852Q750 852 744 846L665 777Q648 765 631 777L541 846Q532 852 520 852L340 852Q255 852 255 770L255 677L262 675A80 80 0 0 0 262 515L255 513Z";

export const MARK_VIEWBOX = "245 325 805 537";

export function Mark({ size = 28, color = "var(--accent)", className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} width={size * 1.5} height={size} className={className} aria-hidden focusable="false">
      <path d={MARK_PATH} fill={color} />
    </svg>
  );
}

export function Logo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span className={`logo ${className ?? ""}`} style={{ fontSize: size * 0.82 }}>
      <Mark size={size} />
      <span className="logo-divider" aria-hidden />
      <span className="logo-word">Kovenra</span>
    </span>
  );
}
