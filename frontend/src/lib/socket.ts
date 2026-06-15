import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${process.env.NEXT_PUBLIC_WS_URL}/realtime`, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectAsManager(companyId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('manager:join', { companyId });
  return s;
}
