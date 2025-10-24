"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const crypto_1 = require("crypto");
class GameManager {
    constructor() {
        this.rooms = new Map();
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    createOrJoinRoom(roomId, player, isCreator) {
        const existing = this.rooms.get(roomId);
        if (!existing) {
            const room = {
                id: roomId,
                secretNumber: null,
                upperLimit: 100,
                players: [player],
                currentTurn: 0,
                isActive: false,
                creatorId: player.id,
            };
            this.rooms.set(roomId, room);
            return room;
        }
        if (!existing.players.find((p) => p.id === player.id)) {
            existing.players.push(player);
        }
        if (isCreator && !existing.creatorId) {
            existing.creatorId = player.id;
        }
        return existing;
    }
    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return undefined;
        room.players = room.players.filter((p) => p.id !== playerId);
        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return undefined;
        }
        if (room.currentTurn >= room.players.length) {
            room.currentTurn = 0;
        }
        if (!room.players.find((p) => p.id === room.creatorId)) {
            room.creatorId = room.players[0].id;
        }
        return room;
    }
    setUpperLimit(roomId, upperLimit) {
        const room = this.rooms.get(roomId);
        if (!room)
            return undefined;
        room.upperLimit = Math.max(2, Math.floor(upperLimit));
        return room;
    }
    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return undefined;
        room.secretNumber = (0, crypto_1.randomInt)(1, room.upperLimit + 1);
        room.isActive = true;
        room.currentTurn = 0;
        return room;
    }
    makeGuess(roomId, playerName, guess) {
        const room = this.rooms.get(roomId);
        if (!room || !room.isActive || room.secretNumber == null)
            return null;
        const normalized = Math.floor(guess);
        if (normalized < 1 || normalized > room.upperLimit) {
            return {
                message: normalized < 1 ? "Too Low" : "Too High",
                correct: false,
            };
        }
        if (normalized === room.secretNumber) {
            room.isActive = false;
            const number = room.secretNumber;
            room.secretNumber = null;
            return { message: "Correct!", correct: true, number };
        }
        const hint = normalized > room.secretNumber ? "Too High" : "Too Low";
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        return { message: hint, correct: false };
    }
    newRound(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return undefined;
        room.secretNumber = null;
        room.isActive = false;
        room.currentTurn = 0;
        return room;
    }
}
exports.GameManager = GameManager;
