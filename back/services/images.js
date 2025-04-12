// services/images.js
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { redis } from "./redis.js";

// Diretório onde as imagens serão armazenadas
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Garantir que o diretório de uploads existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Função para processar e salvar uma imagem
export async function processAndSaveImage(file) {
  try {
    // Gerar um ID único para a imagem
    const imageId = uuidv4();
    // Sempre usar extensão .webp para todas as imagens
    const fileExtension = ".webp";
    const fileName = `${imageId}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Processar a imagem com sharp e converter para WebP
    await sharp(file.buffer)
      .resize(600, null, {
        // Redimensionar para largura máxima de 600px, altura proporcional
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality: 80 }) // Converter para WebP com qualidade 80%
      .toFile(filePath);

    // Verificar o tamanho do arquivo
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;

    // Se ainda estiver acima de 100KB, reduzir mais a qualidade
    if (fileSizeInBytes > 100 * 1024) {
      await sharp(file.buffer)
        .resize(600, null, {
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality: 60 }) // Reduzir mais a qualidade
        .toFile(filePath);
    }

    // Salvar referência no Redis
    await redis.set(`image:${imageId}`, fileName);

    return {
      id: imageId,
      fileName,
      path: `/uploads/${fileName}`,
    };
  } catch (error) {
    console.error("Erro ao processar imagem:", error);
    throw new Error("Falha ao processar imagem");
  }
}

// Função para obter o caminho de uma imagem pelo ID
export async function getImagePath(imageId) {
  const fileName = await redis.get(`image:${imageId}`);
  if (!fileName) return null;

  return `/uploads/${fileName}`;
}

// Função para excluir uma imagem
export async function deleteImage(imageId) {
  try {
    const fileName = await redis.get(`image:${imageId}`);
    if (!fileName) return false;

    const filePath = path.join(UPLOAD_DIR, fileName);

    // Verificar se o arquivo existe antes de tentar excluir
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remover a referência do Redis
    await redis.del(`image:${imageId}`);

    return true;
  } catch (error) {
    console.error("Erro ao excluir imagem:", error);
    return false;
  }
}

// Função para excluir todas as imagens de uma sala
export async function deleteRoomImages(chatId) {
  try {
    console.log(`Tentando excluir imagens da sala ${chatId}`);

    // Obter todas as chaves de imagem associadas à sala
    const imageKeys = await redis.keys(`chat:${chatId}:image:*`);
    console.log(
      `Encontradas ${imageKeys.length} chaves de imagem para a sala ${chatId}`
    );

    // Para cada chave, extrair o ID da imagem e excluir
    for (const key of imageKeys) {
      const imageId = key.split(":").pop();
      console.log(`Excluindo imagem ${imageId} da sala ${chatId}`);

      // Obter o nome do arquivo antes de excluir
      const fileName = await redis.get(`image:${imageId}`);
      if (fileName) {
        console.log(`Arquivo encontrado: ${fileName}`);

        // Excluir o arquivo físico
        const filePath = path.join(UPLOAD_DIR, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Arquivo físico excluído: ${filePath}`);
        } else {
          console.log(`Arquivo físico não encontrado: ${filePath}`);
        }

        // Excluir a referência no Redis
        await redis.del(`image:${imageId}`);
        console.log(`Referência Redis excluída para imagem ${imageId}`);
      } else {
        console.log(`Nenhum arquivo encontrado para imagem ${imageId}`);
      }

      // Excluir a chave de associação sala-imagem
      await redis.del(key);
      console.log(`Chave de associação excluída: ${key}`);
    }

    // Verificar se há imagens nas mensagens da sala
    const messagesKey = `chat:${chatId}:messages`;
    const messages = await redis.lrange(messagesKey, 0, -1);

    // Extrair IDs de imagem das mensagens
    const imageIds = new Set();
    for (const msg of messages) {
      try {
        const message = JSON.parse(msg);
        if (message.imageId) {
          imageIds.add(message.imageId);
        }
      } catch (e) {
        console.error(`Erro ao analisar mensagem: ${e.message}`);
      }
    }

    console.log(
      `Encontrados ${imageIds.size} IDs de imagem nas mensagens da sala ${chatId}`
    );

    // Excluir imagens encontradas nas mensagens
    for (const imageId of imageIds) {
      console.log(`Excluindo imagem ${imageId} encontrada nas mensagens`);

      // Obter o nome do arquivo
      const fileName = await redis.get(`image:${imageId}`);
      if (fileName) {
        // Excluir o arquivo físico
        const filePath = path.join(UPLOAD_DIR, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Arquivo físico excluído: ${filePath}`);
        }

        // Excluir a referência no Redis
        await redis.del(`image:${imageId}`);
        console.log(`Referência Redis excluída para imagem ${imageId}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`Erro ao excluir imagens da sala ${chatId}:`, error);
    return false;
  }
}
