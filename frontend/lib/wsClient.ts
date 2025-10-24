export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

export function createClient() {
  return new WebSocket(WS_URL);
}
