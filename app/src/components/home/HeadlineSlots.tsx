"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Mark } from "../brand";

type Face = { bg: string; node: React.ReactNode };

const ICON = (d: string, color = "#1a1203") => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

const SETS: Face[][] = [
  [
    { bg: "linear-gradient(145deg,#ffd16a,#f39c12)", node: <Mark size={22} color="#1a1203" /> },
    { bg: "linear-gradient(145deg,#2b2b30,#121214)", node: ICON("M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z", "#fdb129") },
    { bg: "linear-gradient(145deg,#7c5cff,#3b1fd1)", node: ICON("M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z M9 12l2 2 4-4", "#fff") },
  ],
  [
    { bg: "linear-gradient(145deg,#4ade80,#059669)", node: ICON("M5 12.5l4.5 4.5L19 7.5", "#04261a") },
    { bg: "linear-gradient(145deg,#f4f4f5,#c4c4cc)", node: ICON("M12 8a4 4 0 1 0 0-.01 M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6", "#111") },
    { bg: "linear-gradient(145deg,#fb7185,#be123c)", node: ICON("M4 8h16v12H4z M12 4v4 M9 14h.01 M15 14h.01 M5 5l14 14", "#fff") },
  ],
  [
    { bg: "linear-gradient(145deg,#1f9d55,#0f5132)", node: <b style={{ color: "#fff", fontSize: "0.5em", fontWeight: 800 }}>₦</b> },
    { bg: "linear-gradient(145deg,#26a17b,#137a5a)", node: <b style={{ color: "#fff", fontSize: "0.5em", fontWeight: 800 }}>₮</b> },
    { bg: "linear-gradient(145deg,#fcff52,#d4d40f)", node: ICON("M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h3v3 M21 21h-4", "#111") },
  ],
];

/** App-icon slots inside the headline that open, then flick through faces (Mobbin's hero). */
export function Slot({ set, delay }: { set: number; delay: number }) {
  const reduce = useReducedMotion();
  const faces = SETS[set];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let iv: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      iv = setInterval(() => setI((x) => (x + 1) % faces.length), 2600);
    }, 1200 + delay * 1000);
    return () => {
      clearTimeout(t);
      if (iv) clearInterval(iv);
    };
  }, [faces.length, delay, reduce]);

  return (
    <motion.span
      className="slot"
      initial={reduce ? false : { width: 0, opacity: 0 }}
      animate={{ width: "0.92em", opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.5 + delay, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={i}
          className="slot-in"
          style={{ background: faces[i].bg }}
          initial={{ y: "70%", scale: 0.7, opacity: 0, filter: "blur(6px)" }}
          animate={{ y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: "-70%", scale: 0.7, opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {faces[i].node}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}
