// services/chat.js
import { getRoomClients } from "./clients.js";
import { redis } from "./redis.js";

const lastSenderMap = new Map();

export function broadcastToRoom(chatId, data) {
  const message = JSON.stringify(data);
  getRoomClients(chatId).forEach((client) => {
    if (client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });
}

export async function updatePermissions(chatId) {
  const clients = getRoomClients(chatId);
  const lastSenderId = await redis.get(`chat:${chatId}:lastSenderId`);

  if (clients.length <= 1) {
    clients.forEach((c) => {
      c.canWrite = true;
      sendStatus(c, clients.length);
    });
    return;
  }

  clients.forEach((c) => {
    const canWrite = !lastSenderId || c.id !== lastSenderId;
    c.canWrite = canWrite;
    sendStatus(c, clients.length);
  });
}

function sendStatus(client, total) {
  if (client.ws.readyState === 1) {
    client.ws.send(
      JSON.stringify({
        type: "status",
        canWrite: client.canWrite,
        total,
      })
    );
  }
}

export async function sendHistoryToClient(ws, chatId) {
  const rawMessages = await redis.lrange(`chat:${chatId}:messages`, -16, -1);
  const messages = rawMessages.map((m) => JSON.parse(m));
  const lastSenderId = await redis.get(`chat:${chatId}:lastSenderId`);

  ws.send(JSON.stringify({ type: "history", messages }));

  if (lastSenderId) {
    updateLastSender(chatId, lastSenderId);
  }
}

export function updateLastSender(chatId, userId) {
  lastSenderMap.set(chatId, userId);
}
