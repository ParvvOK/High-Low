"use client";
import { AnimatePresence, motion } from "framer-motion";

export type Player = { id: string; name: string };

export function PlayerList({ players }: { players: Player[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <AnimatePresence>
        {players.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass rounded-xl px-4 py-3 border border-white/10"
          >
            {p.name}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
