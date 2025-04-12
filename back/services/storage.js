// services/storage.js
import { redis } from "./redis.js";
import { getRoomClients } from "./clients.js";
import { deleteRoomImages } from "./images.js";

// Tempo de vida das salas em horas
const ROOM_LIFETIME_HOURS = process.env.ROOM_LIFETIME_HOURS || 24;

export async function saveMessage(chatId, message, lastSenderId) {
  const key = `chat:${chatId}:messages`;

  // Salva a nova mensagem
  await redis.rpush(key, JSON.stringify(message));

  // Mantém apenas as últimas 16 mensagens
  await redis.ltrim(key, -16, -1);

  // Atualiza o último remetente
  await redis.set(`chat:${chatId}:lastSenderId`, lastSenderId);

  // Se a mensagem contiver uma imagem no formato markdown, salvar a referência
  if (message.content && message.content.includes("![")) {
    const imgMatch = message.content.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      const imageUrl = imgMatch[2];
      const imageId = imageUrl.split("/").pop().replace(".webp", "");
      await redis.set(`chat:${chatId}:image:${imageId}`, "1");
    }
  }

  // Retorna apenas as últimas 16 mensagens
  const rawMessages = await redis.lrange(key, 0, -1);
  return rawMessages.map((msg) => JSON.parse(msg));
}

export async function readMessages(chatId) {
  const rawMessages = await redis.lrange(`chat:${chatId}:messages`, -16, -1);
  return rawMessages.map((msg) => JSON.parse(msg));
}

export async function saveRoom(chatId) {
  // Incrementa o contador de salas criadas hoje
  const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
  const key = `chat:rooms:created:${today}`;
  await redis.incr(key);

  // Define um tempo de expiração para o contador
  const expirationSeconds = Math.floor(ROOM_LIFETIME_HOURS * 60 * 60);
  await redis.expire(key, expirationSeconds);

  // Salva a sala
  await redis.sadd("chat:rooms", chatId);

  // Armazena a data de criação da sala
  const createdAt = new Date().toISOString();
  await redis.set(`chat:${chatId}:created_at`, createdAt);

  // Define um tempo de expiração para a sala
  await redis.expire(`chat:${chatId}:created_at`, expirationSeconds);
  await redis.expire(`chat:${chatId}:messages`, expirationSeconds);
  await redis.expire(`chat:${chatId}:lastSenderId`, expirationSeconds);
}

export async function getAllRooms() {
  const salas = await redis.smembers("chat:rooms");
  const salasComInfo = await Promise.all(
    salas.map(async (sala) => {
      const createdAt = await redis.get(`chat:${sala}:created_at`);
      const total = getRoomClients(sala).length;
      const now = new Date().toISOString();

      // Calcular apenas a data de expiração
      const expiresAt = createdAt
        ? new Date(
            new Date(createdAt).getTime() + ROOM_LIFETIME_HOURS * 60 * 60 * 1000
          ).toISOString()
        : new Date(
            new Date(now).getTime() + ROOM_LIFETIME_HOURS * 60 * 60 * 1000
          ).toISOString();

      return {
        name: sala,
        total,
        createdAt: createdAt || now,
        expiresAt,
      };
    })
  );

  // Filtrar salas expiradas
  const now = new Date();
  const salasAtivas = salasComInfo.filter((sala) => {
    const expiresAt = new Date(sala.expiresAt);
    return expiresAt > now;
  });

  return salasAtivas;
}

// Função para limpar salas expiradas (pode ser chamada periodicamente)
export async function cleanupExpiredRooms() {
  const salas = await redis.smembers("chat:rooms");
  const salasExpiradas = [];

  for (const sala of salas) {
    const createdAt = await redis.get(`chat:${sala}:created_at`);

    if (createdAt) {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const diffHours = (now - createdDate) / (1000 * 60 * 60);

      if (diffHours >= ROOM_LIFETIME_HOURS) {
        // Limpar a sala completamente
        await limparSalaCompletamente(sala);

        // Adicionar à lista de salas expiradas
        salasExpiradas.push(sala);
      }
    } else {
      // Se não tiver data de criação, também remove
      await limparSalaCompletamente(sala);
      salasExpiradas.push(sala);
    }
  }

  return salasExpiradas;
}

// Função para limpar completamente uma sala do Redis
export async function limparSalaCompletamente(chatId) {
  try {
    console.log(`Iniciando limpeza completa da sala ${chatId}`);

    // Primeiro, excluir imagens da sala
    console.log(`Chamando deleteRoomImages para a sala ${chatId}`);
    await deleteRoomImages(chatId);
    console.log(`deleteRoomImages concluído para a sala ${chatId}`);

    // Remover do conjunto de salas
    await redis.srem("chat:rooms", chatId);
    console.log(`Sala ${chatId} removida do conjunto de salas`);

    // Remover chaves conhecidas
    const keysToDelete = [
      `chat:${chatId}:created_at`,
      `chat:${chatId}:messages`,
      `chat:${chatId}:lastSenderId`,
      `chat:${chatId}:expires_at`,
    ];

    // Remover todas as chaves de uma vez
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(`Chaves conhecidas removidas para a sala ${chatId}`);
    }

    // Remover qualquer outra chave que possa estar relacionada à sala
    const keys = await redis.keys(`chat:${chatId}:*`);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redis.del(key)));
      console.log(
        `${keys.length} chaves adicionais removidas para a sala ${chatId}`
      );
    }

    console.log(`Limpeza completa da sala ${chatId} concluída`);
  } catch (err) {
    console.error(`Erro ao limpar sala ${chatId}:`, err);
  }
}

export async function roomExists(chatId) {
  // Verificar se a sala está no conjunto de salas
  const exists = await redis.sismember("chat:rooms", chatId);

  if (!exists) return false;

  // Verificar se a sala expirou
  const createdAt = await redis.get(`chat:${chatId}:created_at`);
  if (!createdAt) return false;

  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffHours = (now - createdDate) / (1000 * 60 * 60);

  // Se a sala expirou, removê-la do conjunto e retornar false
  if (diffHours >= ROOM_LIFETIME_HOURS) {
    // Limpar a sala completamente
    await limparSalaCompletamente(chatId);
    return false;
  }

  return true;
}

export async function getRoomsCreatedToday() {
  const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
  const key = `chat:rooms:created:${today}`;
  const count = await redis.get(key);
  return count ? parseInt(count) : 0;
}

export async function isDailyLimitReached() {
  const count = await getRoomsCreatedToday();
  return count >= 100;
}

export async function getRoomCreationTime(chatId) {
  return await redis.get(`chat:${chatId}:created_at`);
}

export async function getRoomExpirationTime(chatId) {
  const createdAt = await getRoomCreationTime(chatId);
  if (!createdAt) return null;

  return new Date(
    new Date(createdAt).getTime() + ROOM_LIFETIME_HOURS * 60 * 60 * 1000
  ).toISOString();
}
