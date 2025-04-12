import { initFeedback } from "./feedback.js";

// Inicializar o feedback quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM carregado, inicializando feedback...");
  initFeedback();
  console.log("Inicialização concluída!");
});
