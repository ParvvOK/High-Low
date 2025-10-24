"use client";
import { AnimatePresence, motion } from "framer-motion";

export function WinnerModal({
  open,
  player,
  number,
  onPlayAgain,
}: {
  open: boolean;
  player: string;
  number: number;
  onPlayAgain: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 grid place-items-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="card w-full max-w-md text-center"
          >
            <div className="text-3xl mb-2">🏆 {player} won!</div>
            <div className="text-white/70 mb-6">The number was {number}</div>
            <button className="btn" onClick={onPlayAgain}>
              Play Again
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
