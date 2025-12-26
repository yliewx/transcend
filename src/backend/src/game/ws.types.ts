import { WebSocket } from 'ws';

export const onlineUsers = new Map<string, WebSocket>();

export interface InputMessage {
  gameId: string;
  playerId: string;
  side?: 'left' | 'right';
  input: {
    paddleUp: boolean;
    paddleDown: boolean;
  };
};

export function sendError(socket: WebSocket, error: string) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({ type: 'error', data: { message: error } }));
  }
}
