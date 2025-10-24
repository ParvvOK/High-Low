import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { GameManager } from "./gameManager";
import type { ClientMessage, ClientMeta, Player, ServerMessage } from "./types";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
const game = new GameManager();

type WS = import("ws").WebSocket & { _meta?: ClientMeta };

function broadcast(roomId: string, data: ServerMessage) {
  for (const client of wss.clients) {
    const ws = client as WS;
    if (ws.readyState === ws.OPEN && ws._meta?.roomId === roomId) {
      ws.send(JSON.stringify(data));
    }
  }
}

wss.on("connection", (ws: WS) => {
  ws._meta = { roomId: null, name: null, id: randomUUID() };

  ws.on("message", (raw: Buffer) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid JSON",
        } satisfies ServerMessage)
      );
      return;
    }

    switch (msg.type) {
      case "join_room": {
        const existingRoom = game.getRoom(msg.roomId);
        const isCreator = !existingRoom;
        const player: Player = { id: msg.clientId, name: msg.name };

        const playerExists = existingRoom?.players.find(
          (p) => p.id === player.id
        );

        const room = game.createOrJoinRoom(msg.roomId, player, isCreator);
        ws._meta = { roomId: msg.roomId, name: msg.name, id: msg.clientId };
        const safeRoom = { ...room, secretNumber: undefined } as any;
        ws.send(
          JSON.stringify({
            type: "room_joined",
            room: safeRoom,
          } satisfies ServerMessage)
        );

        if (!playerExists) {
          broadcast(msg.roomId, {
            type: "player_joined",
            player,
            roomId: msg.roomId,
          });
        }
        break;
      }
      case "set_limit": {
        const room = game.setUpperLimit(msg.roomId, msg.upperLimit);
        if (!room) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room not found",
            } satisfies ServerMessage)
          );
          return;
        }
        broadcast(msg.roomId, {
          type: "new_round",
          roomId: msg.roomId,
          upperLimit: room.upperLimit,
        });
        break;
      }
      case "start_game": {
        const room = game.startGame(msg.roomId);
        if (!room) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room not found",
            } satisfies ServerMessage)
          );
          return;
        }
        const currentPlayer = room.players[room.currentTurn];
        if (currentPlayer) {
          broadcast(msg.roomId, {
            type: "game_start",
            roomId: msg.roomId,
            upperLimit: room.upperLimit,
            starterId: room.creatorId,
            currentPlayerId: currentPlayer.id,
          });
        }
        break;
      }
      case "guess": {
        const room = game.getRoom(msg.roomId);
        if (!room) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room not found",
            } satisfies ServerMessage)
          );
          return;
        }
        const currentPlayer = room.players[room.currentTurn];
        if (!currentPlayer || currentPlayer.id !== msg.clientId) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Not your turn",
            } satisfies ServerMessage)
          );
          return;
        }
        const result = game.makeGuess(msg.roomId, msg.name, msg.guess);
        if (!result) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid guess or room",
            } satisfies ServerMessage)
          );
          return;
        }
        broadcast(msg.roomId, {
          type: "result",
          player: msg.name,
          guess: msg.guess,
          message: result.message,
          roomId: msg.roomId,
        });
        if (result.correct) {
          console.log("Sending winner message:", {
            player: msg.name,
            number: result.number,
          });
          broadcast(msg.roomId, {
            type: "winner",
            player: msg.name,
            number: result.number!,
            roomId: msg.roomId,
          });
          setTimeout(() => {
            const updated = game.newRound(msg.roomId);
            if (updated) {
              broadcast(msg.roomId, {
                type: "new_round",
                roomId: msg.roomId,
                upperLimit: updated.upperLimit,
              });
            }
          }, 100);
          setTimeout(() => {
            broadcast(msg.roomId, {
              type: "redirect_to_lobby",
              roomId: msg.roomId,
            });
          }, 3000);
        } else {
          const updated = game.getRoom(msg.roomId);
          if (updated) {
            const nextPlayer = updated.players[updated.currentTurn];
            if (nextPlayer)
              broadcast(msg.roomId, {
                type: "turn",
                roomId: msg.roomId,
                currentPlayerId: nextPlayer.id,
              });
          }
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    const meta = ws._meta;
    if (!meta?.roomId || !meta.id) return;
    const room = game.leaveRoom(meta.roomId, meta.id);
    if (room) {
      broadcast(meta.roomId, {
        type: "player_left",
        playerId: meta.id,
        roomId: meta.roomId,
      });
    }
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
httpServer.listen(PORT, () => {
  console.log(`backend listening on http://localhost:${PORT}`);
});
