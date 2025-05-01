import { WebSocket } from 'ws';

// key: user ID, value: client socket
export const onlineUsers = new Map<number, WebSocket>();

export interface InputMessage {
  gameId: string;
  playerId: number;
  side?: 'left' | 'right'; // local play only
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
