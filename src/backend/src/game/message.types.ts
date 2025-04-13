import { WebSocket } from 'ws';

export function sendError(socket: WebSocket, error: string) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({ type: 'error', data: error }));
  }
}
