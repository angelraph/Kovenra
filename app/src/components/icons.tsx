import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true,
});

export const Arrow = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const Chevron = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 9l6 6 6-6" /></svg>;
export const Check = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
export const X = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Menu = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 8h16M4 16h16" /></svg>;
export const Pause = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M9 6v12M15 6v12" /></svg>;
export const Play = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" /></svg>;
export const Left = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const Right = Arrow;
export const Shield = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>;
export const User = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
export const Bot = ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="4" y="8" width="16" height="12" rx="4" /><path d="M12 4v4M9 14h.01M15 14h.01" /></svg>;
export const Qr = ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3M21 14v.01M14 21h3M21 18v3" /></svg>;
export const Ticket = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" /><path d="M9 12l2 2 4-4" /></svg>;
export const Bolt = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M13 3L5 14h6l-1 7 8-11h-6z" /></svg>;
export const Globe = ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></svg>;
export const Lock = ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const Copy = ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;
export const Send = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
export const Calendar = ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
export const Chart = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
export const Scan = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" /></svg>;
export const Wallet = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 7a2 2 0 0 1 2-2h11v4" /><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M16 13.5h.01" /></svg>;
export const Github = ({ size = 18, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
  </svg>
);
export const XLogo = ({ size = 16, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" />
  </svg>
);
