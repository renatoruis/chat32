import { connectWebSocket } from "./core/ws.js";
import { config } from "./config.js";
import { showFeedback } from "./core/feedback.js";

// DOM refs
export const form = document.getElementById("form");
export const input = document.getElementById("input");
export const messagesDiv = document.getElementById("messages");
export const charCount = document.getElementById("char-count");
export const connectionCount = document.getElementById("connection-count");
export const roomNameElement = document.getElementById("room-name");
export const roomInfo = document.getElementById("room-info");
export const changeRoom = document.getElementById("change-room");
export const rulesModal = document.getElementById("rules-modal");
export const closeRulesBtn = document.getElementById("close-rules");
export const closeModal = document.getElementById("close-modal");
export const timeLeft = document.getElementById("time-left");
export const cameraBtn = document.getElementById("camera-btn");
export const imageInput = document.getElementById("image-input");

// Variáveis globais
export let canWrite = true;
export let currentImageId = null;
export let isUploading = false;
export let chatId = localStorage.getItem("chat_room");
export let roomName = localStorage.getItem("room_name");
export let userName = localStorage.getItem("user_name");

if (!chatId) {
  window.location.href = "searcharenas.html";
}

// Atualizar o nome da sala na interface
if (roomName) {
  roomNameElement.textContent = roomName;
}

export function updateCanWrite(val) {
  canWrite = val;
  if (!input || !form) return;

  input.disabled = !val;
  if (cameraBtn) cameraBtn.disabled = !val;
  const submitBtn = form.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = !val;

  input.classList.remove(
    "border-green-500",
    "border-red-500",
    "border-yellow-500"
  );
  if (val) {
    input.classList.add("border-green-500");
    input.placeholder = "Digite sua mensagem...";
  } else {
    input.classList.add("border-red-500");
    input.placeholder = "Você não pode escrever neste momento";
  }
}

export function updateCharCount() {
  if (!input || !charCount) return;
  charCount.textContent = `${input.value.length}/32`;
}

if (input) {
  input.addEventListener("input", updateCharCount);
}

// Função para enviar mensagem
async function enviarMensagem(e) {
  if (e) e.preventDefault();

  if (!input || !input.value.trim()) return;

  const mensagem = input.value.trim();
  input.value = "";
  updateCharCount();

  try {
    console.log("Enviando mensagem:", mensagem);

    // Enviar mensagem através do WebSocket
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
      window.socket.send(
        JSON.stringify({
          type: "message",
          text: mensagem,
        })
      );
      showFeedback("Mensagem enviada com sucesso", "success");
    } else {
      throw new Error("WebSocket não está conectado");
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    showFeedback("Erro ao enviar mensagem", "error");
    return null;
  }
}

// Função para comprimir imagem antes do upload
async function compressImage(file) {
  // Verificar se o arquivo já é pequeno o suficiente
  if (file.size <= config.MAX_IMAGE_SIZE) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Redimensionar se a imagem for muito grande
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para JPEG com qualidade reduzida
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.7
        );
      };
    };
  });
}

// Função para verificar se é um dispositivo iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Função para enviar imagem
async function enviarImagem(imagem) {
  try {
    isUploading = true;
    showFeedback("Comprimindo imagem...", "info");

    // Comprimir a imagem antes de enviar
    const compressedImage = await compressImage(imagem);

    showFeedback("Enviando imagem...", "info");

    const formData = new FormData();
    formData.append("image", compressedImage);
    formData.append("roomId", chatId);

    const response = await fetch(`${config.API_URL}/upload`, {
      method: "POST",
      body: formData,
      mode: "cors",
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 413) {
        throw new Error("Imagem muito grande. Tente uma imagem menor.");
      } else {
        throw new Error(`Erro ao enviar imagem: ${response.status}`);
      }
    }

    const data = await response.json();
    showFeedback("Imagem enviada com sucesso", "success");
    isUploading = false;
    return data;
  } catch (error) {
    showFeedback(`Erro: ${error.message}`, "error");
    console.error(error);
    isUploading = false;
    return null;
  }
}

// Eventos
if (form) {
  form.addEventListener("submit", enviarMensagem);
}

if (changeRoom) {
  changeRoom.addEventListener("click", () => {
    localStorage.removeItem("chat_room");
    window.location.href = "searcharenas.html";
  });
}

if (closeModal) {
  closeModal.addEventListener("click", () => {
    rulesModal.classList.add("hidden");
  });
}

if (cameraBtn) {
  cameraBtn.addEventListener("click", () => {
    // Verificar se é um dispositivo iOS
    const isIOSDevice = isIOS();

    if (isIOSDevice) {
      // Em dispositivos iOS, usar "camera" em vez de "environment"
      imageInput.setAttribute("capture", "camera");
    } else {
      // Em outros dispositivos móveis, usar "environment"
      imageInput.setAttribute("capture", "environment");
    }

    // Remover o atributo capture em desktop
    if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      imageInput.removeAttribute("capture");
    }

    imageInput.click();
  });
}

if (imageInput) {
  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar o tamanho do arquivo antes de tentar fazer o upload
    if (file.size > config.MAX_IMAGE_SIZE * 2) {
      showFeedback(
        "Imagem muito grande. Tente uma imagem menor que 2MB.",
        "error"
      );
      imageInput.value = "";
      return;
    }

    try {
      isUploading = true;
      showFeedback("Comprimindo imagem...", "info");

      // Comprimir a imagem antes de enviar
      const compressedImage = await compressImage(file);

      showFeedback("Enviando imagem...", "info");

      const formData = new FormData();
      formData.append("image", compressedImage);
      formData.append("roomId", chatId);

      // Adicionar um timestamp para evitar cache
      const timestamp = new Date().getTime();
      const url = `${config.API_URL}/upload?t=${timestamp}`;

      const response = await fetch(url, {
        method: "POST",
        body: formData,
        mode: "cors",
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Imagem muito grande. Tente uma imagem menor.");
        } else {
          throw new Error(`Erro ao enviar imagem: ${response.status}`);
        }
      }

      const data = await response.json();
      showFeedback("Imagem enviada com sucesso", "success");

      // Enviar mensagem com a imagem via WebSocket
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(
          JSON.stringify({
            type: "message",
            roomId: chatId,
            content: `![${data.fileName}](${config.API_URL}${data.path})`,
            username: userName || "Anônimo",
          })
        );
      }
    } catch (error) {
      showFeedback(`Erro: ${error.message}`, "error");
      console.error(error);
    } finally {
      isUploading = false;
      // Limpar o input para permitir selecionar a mesma imagem novamente
      imageInput.value = "";
    }
  });
}

// Atualiza o tempo restante da arena
let countdownInterval = null;
let expiresAtDate = null;

// Expor a variável globalmente
window.countdownInterval = countdownInterval;

async function updateTimeLeft() {
  const chatId = localStorage.getItem("chat_room");
  if (!chatId) return;

  try {
    const res = await fetch(`${config.API_URL}/salas/${chatId}`);
    if (!res.ok) return;

    const arena = await res.json();

    // Armazenar a data de expiração
    expiresAtDate = new Date(arena.expiresAt);

    // Iniciar o countdown
    startCountdown();
  } catch (err) {
    console.error("Erro ao obter tempo restante:", err);
  }
}

function startCountdown() {
  // Limpar o intervalo anterior se existir
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Atualizar imediatamente
  updateCountdownDisplay();

  // Configurar o intervalo para atualizar a cada segundo
  countdownInterval = setInterval(updateCountdownDisplay, 1000);

  // Atualizar a variável global
  window.countdownInterval = countdownInterval;
}

function updateCountdownDisplay() {
  if (!expiresAtDate) return;

  const now = new Date();
  const timeLeftMs = expiresAtDate - now;

  if (timeLeftMs <= 0) {
    timeLeft.textContent = "Expirada";
    timeLeft.classList.add("text-red-500");
    clearInterval(countdownInterval);
    return;
  }

  const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    timeLeft.textContent = `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    timeLeft.textContent = `${minutes}m ${seconds}s`;
  } else {
    timeLeft.textContent = `${seconds}s`;
  }

  timeLeft.classList.remove("text-red-500");
}

// Verificar se a sala expirou ao carregar a página
async function verificarExpiracaoSala() {
  const chatId = localStorage.getItem("chat_room");
  if (!chatId) {
    window.location.href = "searcharenas.html";
    return;
  }

  try {
    const res = await fetch(`${config.API_URL}/salas/${chatId}`);
    if (!res.ok) {
      localStorage.removeItem("chat_room");
      window.location.href = "searcharenas.html";
      return;
    }

    const sala = await res.json();
    const expiresAt = new Date(sala.expiresAt);
    const now = new Date();

    if (expiresAt <= now) {
      localStorage.removeItem("chat_room");
      window.location.href = "searcharenas.html";
    }
  } catch (err) {
    console.error("Erro ao verificar expiração da sala:", err);
    localStorage.removeItem("chat_room");
    window.location.href = "searcharenas.html";
  }
}

// Iniciar verificação periódica de expiração
function iniciarVerificacaoPeriodica() {
  // Verificar a cada 30 segundos
  setInterval(verificarExpiracaoSala, 30 * 1000);
}

function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatMessage(msg) {
  const time = new Date(msg.timestamp).toLocaleTimeString();
  return `<div class="message">
    <span class="text-gray-400">[${time}]</span>
    <span class="font-bold">${msg.username}:</span>
    <span>${msg.content}</span>
  </div>`;
}

// Função para verificar e gerenciar o estado da sala
export function verificarEstadoSala() {
  if (!chatId || !roomName || !userName) {
    localStorage.clear();
    window.location.href = "searcharenas.html";
    return false;
  }

  return true;
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  chatId = localStorage.getItem("chat_room");
  roomName = localStorage.getItem("room_name");
  userName = localStorage.getItem("user_name");

  if (!verificarEstadoSala()) return;

  if (roomNameElement) {
    roomNameElement.textContent = roomName;
  }

  // Inicializar WebSocket
  connectWebSocket();

  // Verificar expiração da sala
  verificarExpiracaoSala();
  iniciarVerificacaoPeriodica();
  updateCanWrite(false);

  if (input) {
    input.classList.remove("border-green-500");
    input.classList.add("border-yellow-500");
  }

  updateTimeLeft();
  scrollToBottom();
  const emojiBtn = document.getElementById("emoji-btn");
  let emojiPicker = null;

  if (emojiBtn) {
    emojiBtn.addEventListener("click", () => {
      if (emojiPicker) {
        emojiPicker.remove();
        emojiPicker = null;
        return;
      }

      if (typeof EmojiMart === "undefined") {
        console.error("EmojiMart não foi carregado.");
        showFeedback("Erro ao carregar emoji picker", "error");
        return;
      }

      emojiPicker = new EmojiMart.Picker({
        onEmojiSelect: (emoji) => {
          input.value += emoji.native;
          updateCharCount();
          emojiPicker.remove();
          emojiPicker = null;
          input.focus();
        },
        theme: "dark",
      });

      emojiPicker.classList.add("emoji-picker");

      // POSICIONAMENTO FIXO MOBILE-FRIENDLY
      emojiPicker.style.position = "fixed";
      emojiPicker.style.bottom = "60px";
      emojiPicker.style.right = "16px";

      document.body.appendChild(emojiPicker);
    });
  }

  rulesModal.classList.remove("hidden");

  if (closeRulesBtn) {
    closeRulesBtn.addEventListener("click", () => {
      rulesModal.classList.add("hidden");
    });
  }
});
