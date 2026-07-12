import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/api\/v1\/?$/, "");
    socket = io(baseUrl, { autoConnect: false });
  }
  return socket;
}
