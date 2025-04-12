import { config } from "../config.js";

// Elementos do DOM
let feedbackBtn;
let feedbackModal;
let feedbackForm;
let feedbackCloseBtn;
let feedbackSubmitBtn;
let feedbackTextarea;

// Sistema de feedback visual
const feedbackContainer = document.createElement("div");
feedbackContainer.className = "fixed top-4 right-4 z-50";
document.body.appendChild(feedbackContainer);

// Inicializar o sistema de feedback
export function initFeedback() {
  console.log("Inicializando sistema de feedback...");

  // Criar o botão de feedback
  createFeedbackButton();

  // Criar o modal de feedback
  createFeedbackModal();

  // Adicionar eventos
  setupEventListeners();

  console.log("Sistema de feedback inicializado com sucesso!");
}

// Criar o botão de feedback
function createFeedbackButton() {
  feedbackBtn = document.createElement("div");
  feedbackBtn.className =
    "fixed bottom-4 right-4 z-50 opacity-30 hover:opacity-100 transition-opacity cursor-pointer";
  feedbackBtn.innerHTML = `
    <div class="bg-black border border-[#006600] rounded-full p-2 text-[#00ff00] text-xs">
      <span>💡</span>
    </div>
  `;
  feedbackBtn.title = "Enviar feedback ou sugestão";
  document.body.appendChild(feedbackBtn);
}

// Criar o modal de feedback
function createFeedbackModal() {
  feedbackModal = document.createElement("div");
  feedbackModal.className =
    "fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center hidden";
  feedbackModal.innerHTML = `
    <div class="bg-black border border-[#006600] rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-[#00ff00] font-bold">$ enviar_feedback</h3>
        <button id="feedback-close" class="text-[#00ff00] hover:text-white">
          &times;
        </button>
      </div>
      <form id="feedback-form" class="space-y-4">
        <div>
          <label for="feedback-text" class="block text-[#00ff00] text-sm mb-1"
            >Sua mensagem</label
          >
          <textarea
            id="feedback-text"
            rows="4"
            class="w-full bg-black border border-[#006600] text-[#00ff00] p-2 rounded focus:outline-none focus:border-[#00ff00]"
            placeholder="Digite seu feedback ou sugestão..."
          ></textarea>
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            id="feedback-submit"
            class="bg-[#006600] text-[#00ff00] px-4 py-2 rounded hover:bg-[#008800] transition-colors"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(feedbackModal);
}

// Configurar eventos
function setupEventListeners() {
  // Botão de feedback
  feedbackBtn.addEventListener("click", () => {
    feedbackModal.classList.remove("hidden");
  });

  // Botão de fechar
  feedbackCloseBtn = document.getElementById("feedback-close");
  if (feedbackCloseBtn) {
    feedbackCloseBtn.addEventListener("click", () => {
      feedbackModal.classList.add("hidden");
    });
  }

  // Formulário de feedback
  feedbackForm = document.getElementById("feedback-form");
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      feedbackSubmitBtn = document.getElementById("feedback-submit");
      feedbackTextarea = document.getElementById("feedback-text");

      if (feedbackSubmitBtn && feedbackTextarea) {
        const text = feedbackTextarea.value.trim();
        if (!text) {
          showFeedback("Por favor, digite uma mensagem", "error");
          return;
        }

        // Desabilitar o botão durante o envio
        feedbackSubmitBtn.disabled = true;
        feedbackSubmitBtn.textContent = "Enviando...";

        try {
          // Simular envio de feedback (você pode implementar o envio real aqui)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          showFeedback("Feedback enviado com sucesso!", "success");
          feedbackTextarea.value = "";
          feedbackModal.classList.add("hidden");
        } catch (error) {
          showFeedback("Erro ao enviar feedback", "error");
          console.error(error);
        } finally {
          // Reativar o botão
          feedbackSubmitBtn.disabled = false;
          feedbackSubmitBtn.textContent = "Enviar";
        }
      }
    });
  }
}

export function showFeedback(message, type = "info") {
  const feedback = document.createElement("div");
  feedback.className = `feedback ${type} mb-2 p-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out`;

  const icon = document.createElement("span");
  icon.className = "mr-2";

  switch (type) {
    case "success":
      icon.textContent = "✓";
      feedback.classList.add("bg-green-900", "text-green-100");
      break;
    case "error":
      icon.textContent = "✕";
      feedback.classList.add("bg-red-900", "text-red-100");
      break;
    case "info":
      icon.textContent = "ℹ";
      feedback.classList.add("bg-blue-900", "text-blue-100");
      break;
    case "warning":
      icon.textContent = "⚠";
      feedback.classList.add("bg-yellow-900", "text-yellow-100");
      break;
  }

  feedback.appendChild(icon);
  feedback.appendChild(document.createTextNode(message));

  feedbackContainer.appendChild(feedback);

  // Animação de entrada
  requestAnimationFrame(() => {
    feedback.style.opacity = "1";
    feedback.style.transform = "translateX(0)";
  });

  // Remover após 3 segundos
  setTimeout(() => {
    feedback.style.opacity = "0";
    feedback.style.transform = "translateX(100%)";
    setTimeout(() => feedback.remove(), 100);
  }, 1000);
}
