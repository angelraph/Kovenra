/**
 * Kovenra's own "photos": event scenes drawn in code, in the brand's gold-on-night palette.
 * Each kind has its own stage, lights and crowd, so the site never relies on stock photos.
 */
export type SceneKind = "concert" | "campus" | "gospel" | "comedy" | "tech" | "owambe" | "festival" | "theatre";

const PALETTES: Record<SceneKind, { sky: [string, string]; beam: string; stage: string; accent: string }> = {
  concert: { sky: ["#1a0f02", "#050403"], beam: "#fdb129", stage: "#2a1a05", accent: "#ffcf6e" },
  campus: { sky: ["#071a14", "#030807"], beam: "#34d399", stage: "#0c2a20", accent: "#a7f3d0" },
  gospel: { sky: ["#1d1408", "#070503"], beam: "#fff1c9", stage: "#2b2112", accent: "#fde68a" },
  comedy: { sky: ["#1f0909", "#060303"], beam: "#fb7185", stage: "#2b0f10", accent: "#fecdd3" },
  tech: { sky: ["#0b1020", "#03040a"], beam: "#7dd3fc", stage: "#111a33", accent: "#bae6fd" },
  owambe: { sky: ["#1e0a1f", "#070308"], beam: "#f0abfc", stage: "#2c0f2e", accent: "#fdb129" },
  festival: { sky: ["#241304", "#0a0502"], beam: "#fb923c", stage: "#301a06", accent: "#fdba74" },
  theatre: { sky: ["#170707", "#050202"], beam: "#fdb129", stage: "#3a0b0b", accent: "#fca5a5" },
};

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Real photos for each kind of night (free Unsplash licence, no watermark).
 * Two per kind so several events of the same type don't all look the same.
 */
const PHOTOS: Record<SceneKind, string[]> = {
  concert: ["1470229722913-7c0e2dbbafd3", "1524368535928-5b5e00ddc76b"],
  campus: ["1645730826845-cd2ddec9984f", "1517457373958-b7bdd4587205"],
  gospel: ["1635424906204-723908973078", "1756136836696-0e3374ebfbac"],
  comedy: ["1647589047037-ba94e650388f", "1580188928585-0ef5c1a5c4dd"],
  tech: ["1582192730841-2a682d7375f9", "1762968269894-1d7e1ce8894e"],
  owambe: ["1661332306744-70f9ed1a7f40", "1537706388178-55c10865b82e"],
  festival: ["1636447155412-d57350005073", "1747359637042-985e0c70892d"],
  theatre: ["1503095396549-807759245b35", "1740867650660-e1a0a677e666"],
};

export function photoUrl(kind: SceneKind, seed = 0, w = 900) {
  const list = PHOTOS[kind];
  return `https://images.unsplash.com/photo-${list[seed % list.length]}?auto=format&fit=crop&w=${w}&q=72`;
}

/** A photo with the drawn scene underneath as a fallback, plus a soft brand-tinted fade for legible text. */
export function Scene({ kind, seed = 7, className, w = 900, priority = false }: { kind: SceneKind; seed?: number; className?: string; w?: number; priority?: boolean }) {
  return (
    <div className={`scene-media ${className ?? ""}`}>
      <SceneArt kind={kind} seed={seed} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl(kind, seed, w)} alt="" loading={priority ? "eager" : "lazy"} decoding="async" />
      <span className="scene-fade" aria-hidden />
    </div>
  );
}

function SceneArt({ kind, seed = 7, className }: { kind: SceneKind; seed?: number; className?: string }) {
  const p = PALETTES[kind];
  const r = rand(seed * 97 + kind.length * 13);
  const id = `${kind}-${seed}`;
  const heads: { x: number; y: number; s: number; arm: number }[] = [];
  for (let row = 0; row < 4; row++) {
    const y = 330 + row * 22;
    for (let x = -10; x < 320; x += 14 + r() * 10) heads.push({ x: x + r() * 6, y: y + r() * 8, s: 7 + row * 1.6 + r() * 2, arm: r() });
  }
  const beams = [40, 110, 190, 260].map((x) => ({ x: x + r() * 20, a: -24 + r() * 48 }));
  const stars = Array.from({ length: 26 }, () => ({ x: r() * 300, y: r() * 150, o: 0.2 + r() * 0.6 }));

  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={`${kind} illustration`}>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        <linearGradient id={`beam-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.beam} stopOpacity="0.75" />
          <stop offset="1" stopColor={p.beam} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.62" r="0.55">
          <stop offset="0" stopColor={p.beam} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.beam} stopOpacity="0" />
        </radialGradient>
        <filter id={`blur-${id}`}><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect width="300" height="400" fill={`url(#sky-${id})`} />
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r="0.9" fill="#fff" opacity={s.o * 0.5} />)}
      <ellipse cx="150" cy="250" rx="190" ry="120" fill={`url(#glow-${id})`} />
      {beams.map((b, i) => (
        <polygon key={i} points={`${b.x},40 ${b.x - 6},40 ${b.x - 70 + b.a},400 ${b.x + 70 + b.a},400`} fill={`url(#beam-${id})`} opacity="0.55" filter={`url(#blur-${id})`} />
      ))}
      {kind === "tech" ? (
        <g>
          <rect x="70" y="150" width="160" height="92" rx="6" fill="#0d1428" stroke={p.accent} strokeOpacity="0.5" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={84} y={166 + i * 14} width={40 + ((i * 37) % 90)} height="5" rx="2.5" fill={p.beam} opacity={0.35 + i * 0.1} />)}
          <rect x="140" y="250" width="20" height="40" fill="#0b0f1d" />
        </g>
      ) : kind === "gospel" ? (
        <g>
          <path d="M150 120 L150 175 M128 140 L172 140" stroke={p.accent} strokeWidth="6" strokeLinecap="round" opacity="0.8" />
          {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={66 + i * 19} y={230} width="12" height="44" rx="6" fill={p.stage} stroke={p.accent} strokeOpacity="0.25" />)}
        </g>
      ) : kind === "comedy" || kind === "theatre" ? (
        <g>
          <path d="M0 60 Q40 140 30 300 L0 300Z" fill={kind === "theatre" ? "#5b0f0f" : "#4a1014"} />
          <path d="M300 60 Q260 140 270 300 L300 300Z" fill={kind === "theatre" ? "#5b0f0f" : "#4a1014"} />
          <circle cx="150" cy="215" r="16" fill="#0a0303" />
          <rect x="138" y="230" width="24" height="56" rx="10" fill="#0a0303" />
          <rect x="147" y="200" width="6" height="90" fill="#222" />
        </g>
      ) : kind === "owambe" ? (
        <g>
          {Array.from({ length: 7 }).map((_, i) => (
            <path key={i} d={`M${20 + i * 45} 70 q 22 26 44 0`} stroke={i % 2 ? p.accent : p.beam} strokeWidth="3" fill="none" opacity="0.7" />
          ))}
          {Array.from({ length: 14 }).map((_, i) => <circle key={i} cx={20 + i * 20} cy={75 + (i % 3) * 6} r="3" fill={i % 2 ? p.accent : "#fff"} opacity="0.8" />)}
        </g>
      ) : (
        <g>
          <rect x="40" y="96" width="220" height="10" rx="3" fill="#1b1206" />
          {[60, 100, 140, 180, 220].map((x) => <circle key={x} cx={x} cy="110" r="5" fill={p.accent} />)}
          <rect x="132" y="190" width="36" height="100" rx="14" fill="#0b0703" />
          <circle cx="150" cy="178" r="15" fill="#0b0703" />
          <path d="M136 210 L108 168" stroke="#0b0703" strokeWidth="9" strokeLinecap="round" />
        </g>
      )}
      <rect x="-10" y="286" width="320" height="22" fill={p.stage} />
      <rect x="-10" y="286" width="320" height="2" fill={p.accent} opacity="0.5" />
      {heads.map((h, i) => (
        <g key={i} fill="#030303">
          <circle cx={h.x} cy={h.y} r={h.s} />
          <rect x={h.x - h.s * 1.5} y={h.y + h.s * 0.6} width={h.s * 3} height={h.s * 3} rx={h.s} />
          {h.arm > 0.86 && <path d={`M${h.x + h.s} ${h.y + h.s} L${h.x + h.s * 2} ${h.y - h.s * 2.4}`} stroke="#030303" strokeWidth={h.s * 0.7} strokeLinecap="round" />}
          {h.arm > 0.94 && <rect x={h.x + h.s * 1.5} y={h.y - h.s * 3.6} width={h.s * 0.9} height={h.s * 1.5} rx="1" fill={p.accent} opacity="0.9" />}
        </g>
      ))}
    </svg>
  );
}

export const SCENES: { kind: SceneKind; title: string; city: string }[] = [
  { kind: "concert", title: "Concert night", city: "Abuja" },
  { kind: "campus", title: "Campus show", city: "Nsukka" },
  { kind: "gospel", title: "Gospel concert", city: "Port Harcourt" },
  { kind: "comedy", title: "Comedy special", city: "Ibadan" },
  { kind: "tech", title: "Tech meetup", city: "Enugu" },
  { kind: "owambe", title: "Owambe", city: "Lagos" },
  { kind: "festival", title: "Food festival", city: "Kano" },
  { kind: "theatre", title: "Stage play", city: "Benin City" },
];

/** Pick a scene for a real event from its title, so every event card gets fitting art. */
export function sceneFor(title: string): SceneKind {
  const t = title.toLowerCase();
  if (/(gospel|worship|praise|church|choir)/.test(t)) return "gospel";
  if (/(comedy|laugh|stand.?up)/.test(t)) return "comedy";
  if (/(tech|meetup|hack|dev|summit|conference|workshop|founder)/.test(t)) return "tech";
  if (/(campus|uni|student|faculty|hall)/.test(t)) return "campus";
  if (/(owambe|wedding|party|birthday)/.test(t)) return "owambe";
  if (/(food|festival|fest|carnival)/.test(t)) return "festival";
  if (/(play|theatre|theater|drama|stage)/.test(t)) return "theatre";
  return "concert";
}
