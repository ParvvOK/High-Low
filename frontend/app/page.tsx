"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const room = roomId.trim();
    if (!trimmed || !room) {
      toast.error("Enter username and room ID");
      return;
    }
    localStorage.setItem("hl_name", trimmed);
    router.push(`/lobby/${encodeURIComponent(room)}`);
  };

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 flex justify-center">TooHigh-TooLow</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm text-white/70">Username</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div>
            <label className="block mb-2 text-sm text-white/70">Room ID</label>
            <input className="field" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter Room-Id" />
          </div>
          <button type="submit" className="btn w-full">Join Room</button>
        </form>
      </motion.div>
    </div>
  );
}

