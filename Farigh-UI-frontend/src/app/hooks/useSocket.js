import { io } from 'socket.io-client';
import { useRef } from 'react';

const SOCKET_URL = 'http://localhost:3001';

let _socket = null;

function getSocket() {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return _socket;
}

export function useSocket() {
  const socketRef = useRef(getSocket());
  return socketRef.current;
}
