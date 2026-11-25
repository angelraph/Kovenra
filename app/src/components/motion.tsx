"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades content up from a soft blur when it scrolls into view (Mobbin's title reveal). */
export function Reveal({ children, delay = 0, y = 18, className, as = "div" }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "span" | "li" }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </M>
  );
}

/** Splits a headline into words that rise in one after another. */
export function WordsUp({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block", whiteSpace: "pre" }}
          initial={reduce ? false : { opacity: 0, y: "0.4em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}{i < text.split(" ").length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}

/** Counts up to a number the first time it is seen, then follows live changes. */
export function CountUp({ value, digits = 0, prefix = "", suffix = "" }: { value: number | null | undefined; digits?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${v.toLocaleString("en-NG", { maximumFractionDigits: digits, minimumFractionDigits: digits })}${suffix}`);
  const [shown, setShown] = useState(`${prefix}${(0).toFixed(digits)}${suffix}`);
  useEffect(() => text.on("change", setShown), [text]);
  useEffect(() => {
    if (!inView || value === null || value === undefined || !Number.isFinite(value)) return;
    const c = animate(mv, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [inView, value, mv]);
  if (value === null || value === undefined) return <span ref={ref}>—</span>;
  return <span ref={ref}>{shown}</span>;
}

/** Story paragraphs that brighten one at a time as you scroll (Mobbin). */
export function Story({ lines }: { lines: ReactNode[] }) {
  const refs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [on, setOn] = useState(-1);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setOn(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="story">
      {lines.map((l, i) => (
        <p key={i} data-i={i} ref={(el) => { refs.current[i] = el; }} className={i <= on ? "on" : ""}>{l}</p>
      ))}
    </div>
  );
}

/** Sideways strip with a pause button (Figma's logo row). */
export function Marquee({ children, duration = 38, reverse = false, withControl = true }: { children: ReactNode; duration?: number; reverse?: boolean; withControl?: boolean }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="strip">
      <div className={`marquee ${paused ? "paused" : ""} ${reverse ? "marquee-rev" : ""}`} style={{ flex: 1, ["--marquee-dur" as string]: `${duration}s` }}>
        <div className="marquee-track">
          {children}
          {children}
        </div>
      </div>
      {withControl && (
        <button className="ctrl-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play strip" : "Pause strip"}>
          {paused ? <svg width="14" height="14" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6v12M15 6v12" /></svg>}
        </button>
      )}
    </div>
  );
}
