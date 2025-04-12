import { randomId, randomName } from "../utils/id.js";

const rooms = new Map(); // Map<chatId, Set<client>>

export function createClient(ws) {
  return {
    ws,
    id: null,
    name: null,
    chatId: null,
    lastMessage: null,
    canWrite: false,
  };
}

export function registerClient(client, { id, name, chatId }) {
  client.id = id || randomId();
  client.name = name || randomName();
  client.chatId = chatId || "geral";
  client.canWrite = false;
  if (!rooms.has(chatId)) {
    rooms.set(chatId, new Set());
  }

  rooms.get(chatId).add(client);
}

export function removeClient(client) {
  if (!client.chatId) return;
  const set = rooms.get(client.chatId);
  if (set) {
    set.delete(client);
    if (set.size === 0) {
      rooms.delete(client.chatId);
    }
  }
}

export function getRoomClients(chatId) {
  return [...(rooms.get(chatId) || [])];
}
