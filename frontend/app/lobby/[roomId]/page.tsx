"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Player = { id: string; name: string };
type ServerMessage =
  | { type: "error"; message: string }
  | {
      type: "room_joined";
      room: {
        id: string;
        upperLimit: number;
        players: Player[];
        currentTurn: number;
        isActive: boolean;
        creatorId: string;
      };
    }
  | { type: "player_joined"; player: Player; roomId: string }
  | { type: "player_left"; playerId: string; roomId: string }
  | { type: "new_round"; roomId: string; upperLimit: number }
  | {
      type: "game_start";
      roomId: string;
      upperLimit: number;
      starterId: string;
    }
  | { type: "redirect_to_lobby"; roomId: string };

export default function LobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = decodeURIComponent(String(params.roomId));
  const [players, setPlayers] = useState<Player[]>([]);
  const [upperLimit, setUpperLimit] = useState(100);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const name = useMemo(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("hl_name") || ""
        : "",
    []
  );

  useEffect(() => {
    if (!name) return;

    const stored =
      typeof window !== "undefined" ? localStorage.getItem("hl_id") : null;
    const clientId = stored || crypto.randomUUID();
    if (!stored && typeof window !== "undefined")
      localStorage.setItem("hl_id", clientId);

    const connectTimeout = setTimeout(() => {
      const socket = new WebSocket(
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws"
      );
      setWs(socket);
      socket.onopen = () => {
        socket.send(
          JSON.stringify({ type: "join_room", roomId, name, clientId })
        );
      };

      socket.onmessage = (ev) => {
        const data: ServerMessage = JSON.parse(ev.data);
        if (data.type === "room_joined") {
          setPlayers(data.room.players);
          setUpperLimit(data.room.upperLimit);
        } else if (data.type === "player_joined") {
          setPlayers((p) =>
            p.find((x) => x.id === data.player.id) ? p : [...p, data.player]
          );
        } else if (data.type === "player_left") {
          setPlayers((p) => p.filter((x) => x.id !== data.playerId));
        } else if (data.type === "new_round") {
          setUpperLimit(data.upperLimit);
        } else if (data.type === "game_start") {
          toast.success("Game started!");
          router.push(`/game/${roomId}`);
        } else if (data.type === "redirect_to_lobby") {
          toast.success("Game ended! Back to lobby.");
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
  }, [roomId, router, name]);

  const onSetLimit = () => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: "set_limit", roomId, upperLimit }));
  };

  const onStart = () => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: "start_game", roomId }));
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="card w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Lobby - {roomId}</h2>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-white/70">Set max number</span>
          <input
            type="number"
            min={2}
            className="field max-w-[120px]"
            value={upperLimit}
            onChange={(e) =>
              setUpperLimit(parseInt(e.target.value || "100", 10))
            }
          />
          <button className="btn" onClick={onSetLimit}>
            Update
          </button>
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/70">Players</span>
            <span className="text-white/50 text-sm">{players.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-xl px-4 py-3 border border-white/10 bg-[#17181a]"
                >
                  {p.name}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button className="btn px-6" onClick={onStart}>
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
}
