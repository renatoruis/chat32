import {
  createClient,
  registerClient,
  removeClient,
  getRoomClients,
} from "../services/clients.js";
import {
  broadcastToRoom,
  sendHistoryToClient,
  updatePermissions,
  updateLastSender,
} from "../services/chat.js";
import { saveMessage, getRoomExpirationTime } from "../services/storage.js";

export function handleConnection(ws) {
  let client = createClient(ws);

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      // Verificar se a sala expirou antes de permitir o join
      const expirationTime = await getRoomExpirationTime(data.chatId);
      if (expirationTime && new Date(expirationTime) <= new Date()) {
        ws.send(
          JSON.stringify({
            type: "arena:expired",
            chatId: data.chatId,
          })
        );
        return;
      }

      registerClient(client, data);
      ws.send(
        JSON.stringify({
          type: "init",
          id: client.id,
          name: client.name,
          total: getRoomClients(client.chatId).length,
        })
      );

      sendHistoryToClient(ws, client.chatId);
      ws.send(
        JSON.stringify({
          type: "status",
          canWrite: client.canWrite,
          total: getRoomClients(client.chatId).length,
        })
      );

      updatePermissions(client.chatId);
      broadcastToRoom(client.chatId, {
        type: "users",
        users: getRoomClients(client.chatId).map((c) => c.name),
      });
    }

    if (data.type === "message") {
      if (!client.canWrite) return;

      // Verificar se a sala expirou
      const expirationTime = await getRoomExpirationTime(client.chatId);
      if (expirationTime && new Date(expirationTime) <= new Date()) {
        ws.send(
          JSON.stringify({
            type: "arena:expired",
            chatId: client.chatId,
          })
        );
        return;
      }

      const message = {
        name: client.name,
        text: data.text || "",
        content: data.content || "",
      };

      const messages = await saveMessage(client.chatId, message, client.id);

      broadcastToRoom(client.chatId, {
        type: "message",
        name: client.name,
        text: data.text || "",
        content: data.content || "",
      });

      client.lastMessage = Date.now();

      // 💾 salva quem foi o último a falar
      updateLastSender(client.chatId, client.id);

      updatePermissions(client.chatId);
    }
  });

  ws.on("close", () => {
    removeClient(client);
    updatePermissions(client.chatId);
    broadcastToRoom(client.chatId, {
      type: "users",
      users: getRoomClients(client.chatId).map((c) => c.name),
    });
  });
}
