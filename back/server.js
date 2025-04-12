// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import {
  getAllRooms,
  saveRoom,
  roomExists,
  isDailyLimitReached,
  getRoomsCreatedToday,
  cleanupExpiredRooms,
  getRoomCreationTime,
  getRoomExpirationTime,
  limparSalaCompletamente,
  readMessages,
} from "./services/storage.js";
import { processAndSaveImage, deleteRoomImages } from "./services/images.js";
import http from "http";
import { WebSocketServer } from "ws";
import { handleConnection } from "./handlers/connection.js";
import { getRoomClients } from "./services/clients.js";
import cors from "cors";
import WebSocket from "ws";
import { redis } from "./services/redis.js";
import multer from "multer";
import path from "path";

const app = express();
app.use(express.json());
app.use(cors());

// Configurar multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas"), false);
    }
  },
});

// Servir arquivos estáticos da pasta uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Endpoint GET para listar salas
app.get("/salas", async (req, res) => {
  try {
    const salas = await getAllRooms();
    res.json(salas);
  } catch (err) {
    console.error("Erro ao listar salas:", err);
    res.status(500).json({ error: "Erro ao ler salas" });
  }
});

// Endpoint para verificar o limite diário
app.get("/salas/limite", async (req, res) => {
  try {
    const count = await getRoomsCreatedToday();
    const limitReached = await isDailyLimitReached();

    res.json({
      count,
      limit: 100,
      limitReached,
    });
  } catch (err) {
    console.error("Erro ao verificar limite:", err);
    res.status(500).json({ error: "Erro ao verificar limite" });
  }
});

// Endpoint para verificar uma sala específica
app.get("/salas/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verificar se a sala existe
    const exists = await roomExists(chatId);
    if (!exists) {
      return res.status(404).json({ error: "Sala não encontrada" });
    }

    // Obter informações da sala
    const createdAt = await getRoomCreationTime(chatId);
    const expiresAt = await getRoomExpirationTime(chatId);
    const total = getRoomClients(chatId).length;

    // Verificar se a sala expirou
    const now = new Date();
    const expiraEm = new Date(expiresAt);
    if (expiraEm <= now) {
      // Se a sala expirou, removê-la completamente
      await limparSalaCompletamente(chatId);
      return res.status(404).json({ error: "Sala expirada" });
    }

    res.json({
      name: chatId,
      total,
      createdAt,
      expiresAt,
    });
  } catch (err) {
    console.error("Erro ao verificar sala:", err);
    res.status(500).json({ error: "Erro ao verificar sala" });
  }
});

// Endpoint POST para criar nova sala
app.post("/salas", async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Nome da sala é obrigatório" });
  }

  const trimmed = name.trim();

  if (trimmed.length > 8) {
    return res
      .status(400)
      .json({ error: "O nome da sala deve ter no máximo 8 caracteres" });
  }

  // Verificar se a sala existe e não expirou
  const exists = await roomExists(trimmed);
  if (exists) {
    return res.status(400).json({ error: "Essa sala já existe" });
  }

  // Verificação adicional: garantir que a sala não exista no Redis
  const salaNoRedis = await redis.sismember("chat:rooms", trimmed);
  if (salaNoRedis) {
    // Se a sala ainda estiver no Redis, removê-la completamente
    await limparSalaCompletamente(trimmed);
  }

  // Verificar se o limite diário foi atingido
  const limitReached = await isDailyLimitReached();
  if (limitReached) {
    return res.status(429).json({
      error: "Limite diário de 100 salas atingido. Tente novamente amanhã.",
    });
  }

  await saveRoom(trimmed);
  res.status(201).json({ success: true, room: trimmed });
});

// Endpoint para obter informações de uma sala específica
app.get("/salas/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const exists = await roomExists(name);

    if (!exists) {
      return res.status(404).json({ error: "Sala não encontrada" });
    }

    const salas = await getAllRooms();
    const sala = salas.find((s) => s.name === name);

    if (!sala) {
      return res.status(404).json({ error: "Sala não encontrada" });
    }

    res.json(sala);
  } catch (err) {
    console.error("Erro ao obter informações da sala:", err);
    res.status(500).json({ error: "Erro ao obter informações da sala" });
  }
});

// Endpoint para upload de imagens
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const imageData = await processAndSaveImage(req.file);
    res.status(201).json(imageData);
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    res.status(500).json({ error: "Erro ao processar imagem" });
  }
});

// Endpoint para estatísticas em tempo real
app.get("/stats", async (req, res) => {
  try {
    console.log("Iniciando coleta de estatísticas...");

    // Obter todas as salas
    console.log("Buscando todas as salas...");
    const salas = await getAllRooms();
    console.log(`Encontradas ${salas.length} salas`);

    // Contar o número total de salas
    const totalSalas = salas.length;

    // Contar o número total de pessoas online
    console.log("Contando pessoas online...");
    let totalPessoas = 0;
    for (const sala of salas) {
      try {
        const clientes = getRoomClients(sala.name);
        totalPessoas += clientes.length;
      } catch (err) {
        console.error(`Erro ao contar clientes da sala ${sala.name}:`, err);
      }
    }
    console.log(`Total de pessoas online: ${totalPessoas}`);

    // Contar o número total de mensagens
    console.log("Contando mensagens...");
    let totalMensagens = 0;
    for (const sala of salas) {
      try {
        const mensagens = await readMessages(sala.name);
        totalMensagens += mensagens.length;
      } catch (err) {
        console.error(`Erro ao ler mensagens da sala ${sala.name}:`, err);
      }
    }
    console.log(`Total de mensagens: ${totalMensagens}`);

    // Contar o número de salas criadas hoje
    console.log("Contando salas criadas hoje...");
    const salasCriadasHoje = await getRoomsCreatedToday();
    console.log(`Salas criadas hoje: ${salasCriadasHoje}`);

    // Contar o número de imagens enviadas
    console.log("Contando imagens...");
    let totalImagens = 0;
    for (const sala of salas) {
      try {
        const mensagens = await readMessages(sala.name);
        totalImagens += mensagens.filter((msg) => msg.imageId).length;
      } catch (err) {
        console.error(`Erro ao contar imagens da sala ${sala.name}:`, err);
      }
    }
    console.log(`Total de imagens: ${totalImagens}`);

    // Retornar as estatísticas
    console.log("Enviando resposta...");
    res.json({
      totalSalas,
      totalPessoas,
      totalMensagens,
      salasCriadasHoje,
      totalImagens,
      timestamp: new Date().toISOString(),
    });
    console.log("Estatísticas enviadas com sucesso!");
  } catch (err) {
    console.error("Erro ao obter estatísticas:", err);
    res
      .status(500)
      .json({ error: "Erro ao obter estatísticas", details: err.message });
  }
});

// Endpoint para receber feedback
app.post("/feedback", async (req, res) => {
  try {
    const { email, text, timestamp, userAgent, screenSize } = req.body;

    if (!text) {
      return res
        .status(400)
        .json({ error: "O texto do feedback é obrigatório" });
    }

    // Salvar feedback no Redis
    const feedbackId = `feedback:${Date.now()}`;
    await redis.hmset(feedbackId, {
      email: email || "não fornecido",
      text,
      timestamp,
      userAgent,
      screenSize,
    });

    // Definir expiração para 30 dias
    await redis.expire(feedbackId, 30 * 24 * 60 * 60);

    // Adicionar à lista de feedbacks
    await redis.lpush("feedbacks", feedbackId);

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Erro ao salvar feedback:", err);
    res.status(500).json({ error: "Erro ao salvar feedback" });
  }
});

// endpoint realthcheck com validaçao de conexao com o redis
app.get("/health", async (req, res) => {
  try {
    await redis.ping();
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Erro ao verificar conexão com o Redis:", err);
    res.status(500).json({ error: "Erro ao verificar conexão com o Redis" });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => handleConnection(ws));

// Limpar salas expiradas a cada 30 segundos (antes era 60 segundos)
setInterval(async () => {
  try {
    const salasExpiradas = await cleanupExpiredRooms();

    // Notificar os clientes sobre as salas expiradas
    for (const sala of salasExpiradas) {
      // Obter todos os clientes na sala
      const clients = getRoomClients(sala);

      // Enviar mensagem de expiração para cada cliente
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(
            JSON.stringify({
              type: "arena:expired",
              chatId: sala,
            })
          );
        }
      }

      // Forçar a limpeza da sala
      await limparSalaCompletamente(sala);
    }
  } catch (err) {
    console.error("Erro ao limpar salas expiradas:", err);
  }
}, 30 * 1000);

// Verificar salas próximas de expirar a cada 15 segundos (antes era 30 segundos)
setInterval(async () => {
  try {
    const salas = await getAllRooms();
    const now = new Date();

    for (const sala of salas) {
      const expiresAt = new Date(sala.expiresAt);
      const timeLeft = expiresAt - now;

      // Se a sala expirou nos últimos 15 segundos, notificar os clientes
      if (timeLeft <= 0 && timeLeft > -15000) {
        const clients = getRoomClients(sala.name);

        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "arena:expired",
                chatId: sala.name,
              })
            );
          }
        }

        // Forçar a limpeza da sala
        await limparSalaCompletamente(sala.name);
      }
    }
  } catch (err) {
    console.error("Erro ao verificar salas próximas de expirar:", err);
  }
}, 15 * 1000);

// Limpar salas expiradas ao iniciar o servidor
cleanupExpiredRooms().catch((err) => {
  console.error("Erro ao limpar salas expiradas ao iniciar:", err);
});

server.listen(3000, () => {
  console.log("✅ Server listening on http://localhost:3000");
});
