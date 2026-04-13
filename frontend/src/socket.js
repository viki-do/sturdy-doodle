import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:8000";

// Csak akkor hozzuk létre a kapcsolatot, ha még nincs
export const socket = io(SOCKET_URL, {
    autoConnect: false, // Majd mi indítjuk el manuálisan
    reconnection: true,
});