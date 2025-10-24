export interface Player {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  secretNumber: number | null;
  upperLimit: number;
  players: Player[];
  currentTurn: number;
  isActive: boolean;
  creatorId: string;
}

export type ClientMessage =
  | { type: "join_room"; roomId: string; name: string; clientId: string }
  | { type: "set_limit"; roomId: string; upperLimit: number }
  | { type: "start_game"; roomId: string }
  | {
      type: "guess";
      roomId: string;
      guess: number;
      name: string;
      clientId: string;
    };

export type ServerMessage =
  | { type: "error"; message: string }
  | { type: "room_joined"; room: Omit<Room, "secretNumber"> }
  | { type: "player_joined"; player: Player; roomId: string }
  | { type: "player_left"; playerId: string; roomId: string }
  | {
      type: "game_start";
      roomId: string;
      upperLimit: number;
      starterId: string;
      currentPlayerId: string;
    }
  | {
      type: "result";
      player: string;
      guess: number;
      message: "Too High" | "Too Low" | "Correct!";
      roomId: string;
    }
  | { type: "winner"; player: string; number: number; roomId: string }
  | { type: "new_round"; roomId: string; upperLimit: number }
  | { type: "turn"; roomId: string; currentPlayerId: string }
  | { type: "redirect_to_lobby"; roomId: string };

export interface ClientMeta {
  roomId: string | null;
  name: string | null;
  id: string;
}
