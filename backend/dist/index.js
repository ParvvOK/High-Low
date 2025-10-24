"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const ws_1 = require("ws");
const crypto_1 = require("crypto");
const gameManager_1 = require("./gameManager");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: "http://localhost:3000" }));
const httpServer = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server: httpServer, path: "/ws" });
const game = new gameManager_1.GameManager();
function broadcast(roomId, data) {
    for (const client of wss.clients) {
        const ws = client;
        if (ws.readyState === ws.OPEN && ws._meta?.roomId === roomId) {
            ws.send(JSON.stringify(data));
        }
    }
}
wss.on("connection", (ws) => {
    ws._meta = { roomId: null, name: null, id: (0, crypto_1.randomUUID)() };
    ws.on("message", (raw) => {
        let msg;
        try {
            msg = JSON.parse(String(raw));
        }
        catch {
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid JSON",
            }));
            return;
        }
        switch (msg.type) {
            case "join_room": {
                const existingRoom = game.getRoom(msg.roomId);
                const isCreator = !existingRoom;
                const player = { id: msg.clientId, name: msg.name };
                const playerExists = existingRoom?.players.find((p) => p.id === player.id);
                const room = game.createOrJoinRoom(msg.roomId, player, isCreator);
                ws._meta = { roomId: msg.roomId, name: msg.name, id: msg.clientId };
                const safeRoom = { ...room, secretNumber: undefined };
                ws.send(JSON.stringify({
                    type: "room_joined",
                    room: safeRoom,
                }));
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
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room not found",
                    }));
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
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room not found",
                    }));
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
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room not found",
                    }));
                    return;
                }
                const currentPlayer = room.players[room.currentTurn];
                if (!currentPlayer || currentPlayer.id !== msg.clientId) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Not your turn",
                    }));
                    return;
                }
                const result = game.makeGuess(msg.roomId, msg.name, msg.guess);
                if (!result) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Invalid guess or room",
                    }));
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
                        number: result.number,
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
                }
                else {
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
        if (!meta?.roomId || !meta.id)
            return;
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
