"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type ServerMessage =
  | {
      type: "result";
      player: string;
      guess: number;
      message: "Too High" | "Too Low" | "Correct!";
      roomId: string;
    }
  | { type: "winner"; player: string; number: number; roomId: string }
  | {
      type: "game_start";
      roomId: string;
      upperLimit: number;
      starterId: string;
      currentPlayerId: string;
    }
  | { type: "room_joined"; room: { id: string; upperLimit: number } }
  | { type: "new_round"; roomId: string; upperLimit: number }
  | { type: "turn"; roomId: string; currentPlayerId: string }
  | { type: "redirect_to_lobby"; roomId: string }
  | { type: "error"; message: string };

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = decodeURIComponent(String(params.roomId));
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [upper, setUpper] = useState<number>(100);
  const [guess, setGuess] = useState<string>("");
  const [log, setLog] = useState<
    { player: string; guess: number; message: string }[]
  >([]);
  const [winner, setWinner] = useState<{
    player: string;
    number: number;
  } | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const name = useMemo(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("hl_name") || ""
        : "",
    []
  );

  useEffect(() => {
    if (!name) return;

    const connectTimeout = setTimeout(() => {
      const socket = new WebSocket(
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws"
      );
      setWs(socket);
      socket.onopen = () => {
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("hl_id") : null;
        const clientId = stored || crypto.randomUUID();
        if (!stored && typeof window !== "undefined")
          localStorage.setItem("hl_id", clientId);
        socket.send(
          JSON.stringify({ type: "join_room", roomId, name, clientId })
        );
      };

      socket.onmessage = (ev) => {
        const data: ServerMessage = JSON.parse(ev.data);
        if (data.type === "result") {
          setLog((l) => [
            ...l,
            { player: data.player, guess: data.guess, message: data.message },
          ]);
        } else if (data.type === "winner") {
          setWinner({ player: data.player, number: data.number });
          setLog((l) => {
            const lastEntry = l[l.length - 1];
            if (
              lastEntry &&
              lastEntry.player === data.player &&
              lastEntry.guess === data.number
            ) {
              return l;
            }
            return [
              ...l,
              { player: data.player, guess: data.number, message: "Correct!" },
            ];
          });
        } else if (data.type === "game_start") {
          setUpper(data.upperLimit);
          setLog([]);
          setWinner(null);
          setCurrentPlayerId(data.currentPlayerId);
        } else if (data.type === "room_joined") {
          setUpper(data.room.upperLimit);
        } else if (data.type === "new_round") {
          setUpper(data.upperLimit);
          setLog([]);
        } else if (data.type === "turn") {
          setCurrentPlayerId(data.currentPlayerId);
        } else if (data.type === "redirect_to_lobby") {
          router.push(`/lobby/${roomId}`);
        } else if (data.type === "error") {
          toast.error(data.message);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (
          socket.readyState === WebSocket.CONNECTING ||
          socket.readyState === WebSocket.OPEN
        ) {
          toast.error("Connection error");
        }
      };
    }, 100);

    return () => {
      clearTimeout(connectTimeout);
      if (ws) ws.close();
    };
  }, [roomId, name]);

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [log.length]);

  const submitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws) return;
    const value = parseInt(guess, 10);
    if (Number.isNaN(value)) return;
    const clientId =
      typeof window !== "undefined" ? localStorage.getItem("hl_id") || "" : "";
    ws.send(
      JSON.stringify({ type: "guess", roomId, guess: value, name, clientId })
    );
    setGuess("");
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="card max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-center gap-4 mb-4 text-center">
          <div className="text-sm text-white/60">
            Room:{" "}
            <span className="text-white inline-block max-w-[50vw] truncate align-bottom">
              {roomId}
            </span>
          </div>
          <div className="text-sm text-white/60">
            Upper limit: <span className="text-white">{upper}</span>
          </div>
        </div>
        <form onSubmit={submitGuess} className="flex items-center gap-3 mb-5">
          <input
            className="field"
            type="number"
            min={1}
            max={upper}
            placeholder="Your guess"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={(() => {
              const me =
                typeof window !== "undefined"
                  ? localStorage.getItem("hl_id")
                  : null;
              return (
                currentPlayerId != null && me != null && currentPlayerId !== me
              );
            })()}
          />
          <button
            className="btn"
            disabled={(() => {
              const me =
                typeof window !== "undefined"
                  ? localStorage.getItem("hl_id")
                  : null;
              return (
                currentPlayerId != null && me != null && currentPlayerId !== me
              );
            })()}
          >
            Submit
          </button>
        </form>
        <div className="text-xs mb-3">
          {(() => {
            const me =
              typeof window !== "undefined"
                ? localStorage.getItem("hl_id")
                : null;
            if (!currentPlayerId)
              return (
                <span className="text-white/60">Waiting for turn info...</span>
              );
            return currentPlayerId === me ? (
              <span className="text-[color:var(--accent)]">Your turn</span>
            ) : (
              <span className="text-white/60">Waiting for other players</span>
            );
          })()}
        </div>
        <div
          ref={feedRef}
          className="rounded-xl border border-white/10 bg-[#17181a] p-4 h-80 overflow-y-auto font-mono text-sm"
        >
          <AnimatePresence>
            {log.map((entry, idx) => (
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
      </div>

      <AnimatePresence>
        {winner && (
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
              <div className="text-3xl mb-2">🏆 {winner.player} won!</div>
              <div className="text-white/70 mb-6">
                The number was {winner.number}
              </div>
              <div className="text-sm text-white/60">Redirecting to lobby</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
