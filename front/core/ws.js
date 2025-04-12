import {
  input,
  form,
  connectionCount,
  messagesDiv,
  updateCanWrite,
  roomName,
  chatId,
  userName,
} from "../app.js";
import { config } from "../config.js";
import { showFeedback } from "./feedback.js";

import { saveUser, getUser } from "./storage.js";

let socket;
let myId = null;
let myName = null;

// Função para verificar expiração da sala
async function verificarExpiracaoSala(chatId) {
  if (!chatId) {
    console.warn("verificarExpiracaoSala recebeu chatId vazio.");
    return;
  }

  try {
    console.log("Verificando expiração da sala:", chatId);
    const response = await fetch(`${config.API_URL}/salas/${chatId}`);
    console.log("Status da verificação:", response.status);

    if (!response.ok) {
      console.error("Erro ao verificar sala:", response.status);
      throw new Error("Erro ao verificar expiração da sala");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showFeedback("Erro ao verificar expiração da sala", "error");
    console.error("Erro completo:", error);
    return null;
  }
}

// Função para redirecionar para a página inicial
function redirecionarParaHome() {
  localStorage.removeItem("chat_room");
  window.location.href = "searcharenas.html";
}

// Iniciar verificação periódica de expiração
function iniciarVerificacaoPeriodica() {
  // Verificar a cada (config.EXPIRATION_CHECK_INTERVAL)
  setInterval(verificarExpiracaoSala, config.EXPIRATION_CHECK_INTERVAL * 1000);
}

// Função para conectar WebSocket
export function connectWebSocket() {
  if (!chatId || !roomName || !userName) {
    localStorage.clear();
    window.location.href = "searcharenas.html";
    return;
  }

  try {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const apiUrl = new URL(config.API_URL);
    const wsUrl = `${wsProtocol}//${apiUrl.hostname}:${apiUrl.port || 3000}`;

    socket = new WebSocket(wsUrl);
    window.socket = socket; // Expor o socket globalmente

    socket.onopen = () => {
      showFeedback("Conectado ao servidor", "success");
      const saved = getUser();
      socket.send(
        JSON.stringify({
          type: "join",
          chatId,
          id: saved?.id,
          name: saved?.name,
        })
      );
    };

    socket.onclose = () => {
      showFeedback("Desconectado do servidor", "error");
      setTimeout(connectWebSocket, 5000);
    };

    socket.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
      showFeedback("Erro na conexão WebSocket", "error");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleSocketMessage(data);
    };
  } catch (error) {
    console.error("Erro ao conectar WebSocket:", error);
    showFeedback("Erro ao conectar WebSocket", "error");
  }
}

function handleSocketMessage(data) {
  if (data.type === "init") {
    myId = data.id;
    myName = data.name;
    saveUser(myId, myName);
  }

  if (data.type === "message") {
    const el = document.createElement("div");
    const isMine = data.name === myName;

    el.className = `whitespace-pre-wrap px-2 text-sm font-mono ${
      isMine ? "text-[#00ff00]" : "text-[#00ccff]"
    }`;

    // Adicionar o texto da mensagem
    el.textContent = `${isMine ? ">>" : ">"} ${data.name}: ${data.text || ""}`;

    // Adicionar a imagem se existir no content como markdown
    if (data.content && data.content.includes("![")) {
      const imgMatch = data.content.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const imgContainer = document.createElement("div");
        imgContainer.className = "mt-2";

        const img = document.createElement("img");
        img.src = imgMatch[2]; // URL da imagem
        img.alt = imgMatch[1] || "Imagem da mensagem";
        img.className = "max-w-full rounded border border-[#006600]";
        img.style.maxHeight = "300px";

        // Adicionar tratamento de erro para imagens que não carregam
        img.onerror = function () {
          console.error("Erro ao carregar imagem:", img.src);
          this.onerror = null; // Evitar loop infinito
          this.src = "static/image-error.png"; // Imagem de fallback
          this.alt = "Erro ao carregar imagem";
        };

        imgContainer.appendChild(img);
        el.appendChild(imgContainer);
      }
    }

    if (messagesDiv) {
      messagesDiv.appendChild(el);

      // Limita a 16 mensagens no DOM
      while (messagesDiv.children.length > 16) {
        messagesDiv.removeChild(messagesDiv.firstChild);
      }

      setTimeout(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 0);
    } else {
      console.error("messagesDiv não encontrado");
    }
  }

  if (data.type === "history") {
    if (!messagesDiv) {
      console.error("messagesDiv não encontrado");
      return;
    }

    messagesDiv.innerHTML = ""; // Limpa mensagens antigas

    const ultimasMensagens = data.messages.slice(-16); // 👈 só as 16 mais recentes

    ultimasMensagens.forEach((msg) => {
      const el = document.createElement("div");
      const isMine = msg.name === myName;

      el.className = `whitespace-pre-wrap px-2 text-sm font-mono ${
        isMine ? "text-[#00ff00]" : "text-[#00ccff]"
      }`;

      el.textContent = `${isMine ? ">>" : ">"} ${msg.name}: ${msg.text || ""}`;

      if (msg.content && msg.content.includes("![")) {
        const imgMatch = msg.content.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          const imgContainer = document.createElement("div");
          imgContainer.className = "mt-2";

          const img = document.createElement("img");
          img.src = imgMatch[2];
          img.alt = imgMatch[1] || "Imagem da mensagem";
          img.className = "max-w-full rounded border border-[#006600]";
          img.style.maxHeight = "300px";

          img.onerror = function () {
            console.error("Erro ao carregar imagem:", img.src);
            this.onerror = null;
            this.src = "static/image-error.png";
            this.alt = "Erro ao carregar imagem";
          };

          imgContainer.appendChild(img);
          el.appendChild(imgContainer);
        }
      }

      messagesDiv.appendChild(el);
    });

    // Scroll até o fim
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 0);
  }

  if (data.type === "status") {
    updateCanWrite(data.canWrite);
    if (input) {
      input.disabled = !data.canWrite;
      if (form) {
        const submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = !data.canWrite;
      }
    }

    if (connectionCount) {
      connectionCount.textContent = `${data.total} online`;
    }
  }

  if (data.type === "messages:update") {
    updateMessages(data.messages);
  }

  // Adicionar handler para expiração da arena
  if (data.type === "arena:expired") {
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
      // Remover classe anterior se existir
      chatContainer.classList.remove("arena-expired");

      // Forçar um reflow para garantir que a animação seja executada novamente
      void chatContainer.offsetWidth;

      // Adicionar a classe novamente
      chatContainer.classList.add("arena-expired");

      // Desabilitar o formulário de envio
      const form = document.querySelector(".chat-form");
      if (form) {
        form.style.display = "none";
      }

      // Mostrar mensagem de expiração
      const messagesContainer = document.querySelector(".messages-container");
      if (messagesContainer) {
        const expiredMessage = document.createElement("div");
        expiredMessage.className = "message system expired";
        expiredMessage.textContent =
          "Esta arena expirou! Crie uma nova para continuar conversando.";
        messagesContainer.appendChild(expiredMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }

      // Redirecionar para a página inicial imediatamente
      redirecionarParaHome();
    }
  }
}

// Função para atualizar mensagens
function updateMessages(messages) {
  if (!messagesDiv) {
    console.error("messagesDiv não encontrado");
    return;
  }

  messagesDiv.innerHTML = ""; // Limpa mensagens antigas

  messages.forEach((message) => {
    const el = document.createElement("div");
    const isMine = message.name === myName;

    el.className = `whitespace-pre-wrap px-2 text-sm font-mono ${
      isMine ? "text-[#00ff00]" : "text-[#00ccff]"
    }`;

    // Adicionar o texto da mensagem
    el.textContent = `${isMine ? ">>" : ">"} ${message.name}: ${
      message.text || ""
    }`;

    // Adicionar a imagem se existir no content como markdown
    if (message.content && message.content.includes("![")) {
      const imgMatch = message.content.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const imgContainer = document.createElement("div");
        imgContainer.className = "mt-2";

        const img = document.createElement("img");
        img.src = imgMatch[2]; // URL da imagem
        img.alt = imgMatch[1] || "Imagem da mensagem";
        img.className = "max-w-full rounded border border-[#006600]";
        img.style.maxHeight = "300px";

        // Adicionar tratamento de erro para imagens que não carregam
        img.onerror = function () {
          console.error("Erro ao carregar imagem:", img.src);
          this.onerror = null; // Evitar loop infinito
          this.src = "static/image-error.png"; // Imagem de fallback
          this.alt = "Erro ao carregar imagem";
        };

        imgContainer.appendChild(img);
        el.appendChild(imgContainer);
      }
    }

    messagesDiv.appendChild(el);
  });

  // Garantir que o scroll vá para o final
  setTimeout(() => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, 0);
}

// Função para mostrar o efeito de explosão quando a arena expira
function showArenaExpiredEffect() {
  // Criar o modal de expiração
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50";
  modal.id = "expired-modal";

  // Conteúdo do modal
  const content = document.createElement("div");
  content.className =
    "bg-[#111] text-red-500 p-6 rounded-lg max-w-md text-center shadow-lg border border-red-500 space-y-4";

  // Título
  const title = document.createElement("h2");
  title.className = "text-2xl font-bold mb-4";
  title.textContent = "💥 Arena Expirada 💥";

  // Mensagem
  const message = document.createElement("p");
  message.className = "text-lg";
  message.textContent = "Esta arena expirou e será excluída em breve.";

  // Adicionar elementos ao modal
  content.appendChild(title);
  content.appendChild(message);
  modal.appendChild(content);

  // Adicionar o modal ao body
  document.body.appendChild(modal);

  // Adicionar classe de explosão ao container de mensagens
  messagesDiv.classList.add("explosion-effect");

  // Adicionar efeito de pulsação ao modal
  content.classList.add("pulse-effect");
}

// Verificar expiração da sala ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  const localChatId = localStorage.getItem("chat_room");
  verificarExpiracaoSala(localChatId);
  setInterval(
    () => verificarExpiracaoSala(localChatId),
    config.EXPIRATION_CHECK_INTERVAL * 1000
  );
});

function displayMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  const isCurrentUser = message.userId === window.chatSocket.id;
  messageElement.classList.add(isCurrentUser ? "sent" : "received");

  const messageContent = document.createElement("div");
  messageContent.classList.add("message-content");

  // Adicionar texto da mensagem se existir
  if (message.text) {
    const textElement = document.createElement("p");
    textElement.textContent = message.text;
    messageContent.appendChild(textElement);
  }

  // Adicionar imagem se existir
  if (message.imageId) {
    const imgElement = document.createElement("img");
    imgElement.src = `http://localhost:3000/uploads/${message.imageId}.webp`;
    imgElement.alt = "Imagem da mensagem";
    imgElement.classList.add("message-image");

    // Adicionar tratamento de erro para imagens que não carregam
    imgElement.onerror = function () {
      this.onerror = null; // Evitar loop infinito
      this.src = "static/image-error.png"; // Imagem de fallback
      this.alt = "Erro ao carregar imagem";
    };

    messageContent.appendChild(imgElement);
  }

  messageElement.appendChild(messageContent);
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
