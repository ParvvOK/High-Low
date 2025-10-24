"use client";
import { AnimatePresence, motion } from "framer-motion";

export type GuessEntry = { player: string; guess: number; message: string };

export function GuessLog({ entries }: { entries: GuessEntry[] }) {
  return (
    <div className="glass rounded-xl border border-white/10 p-4 h-80 overflow-y-auto font-mono text-sm">
      <AnimatePresence>
        {entries.map((entry, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="py-1"
          >
            <span className="text-white/80">{entry.player}</span> guessed{" "}
            <span className="text-white">{entry.guess}</span> —{" "}
            <span
              className={
                entry.message === "Correct!"
                  ? "text-[color:var(--accent)]"
                  : entry.message === "Too High"
                  ? "text-red-400"
                  : "text-blue-400"
              }
            >
              {entry.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
