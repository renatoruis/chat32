// Adiciona efeito de cursor piscante ao input
const input = document.querySelector('input[name="message"]');
input.addEventListener("focus", () => {
  input.classList.add("cursor-blink");
});
input.addEventListener("blur", () => {
  input.classList.remove("cursor-blink");
});

// Adiciona efeito de digitação
input.addEventListener("input", () => {
  const charCount = document.getElementById("char-count");
  const maxLength = input.getAttribute("maxlength");
  const currentLength = input.value.length;
  charCount.textContent = `${currentLength}/${maxLength}`;

  // Muda a cor do contador baseado no uso
  if (currentLength > maxLength * 0.8) {
    charCount.style.color = "#ff0000";
  } else if (currentLength > maxLength * 0.6) {
    charCount.style.color = "#ffff00";
  } else {
    charCount.style.color = "#006600";
  }
});

// Adiciona efeito de terminal ao enviar mensagem
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    // Adiciona efeito de "digitando" antes de enviar
    const typingEffect = document.createElement("div");
    typingEffect.className = "terminal-message typing-effect";
    typingEffect.textContent = "> Enviando mensagem...";
    messages.appendChild(typingEffect);

    // Remove o efeito após um breve delay
    setTimeout(() => {
      typingEffect.remove();
      // Continua com o envio normal da mensagem
      // ... existing code ...
    }, 500);
  }
});

// Adiciona efeito de terminal ao receber mensagem
function addMessage(message, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `terminal-message ${
    isUser ? "user-message" : "bot-message"
  }`;

  // Adiciona efeito de digitação para mensagens do bot
  if (!isUser) {
    messageDiv.classList.add("typing-effect");
    setTimeout(() => {
      messageDiv.classList.remove("typing-effect");
      messageDiv.textContent = message;
    }, 500);
  } else {
    messageDiv.textContent = message;
  }

  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;
}
