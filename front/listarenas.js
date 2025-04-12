import { config } from "./config.js";
import { showFeedback } from "./core/feedback.js";

// Função para testar a conexão com o servidor
async function testarConexao() {
  try {
    console.log("Testando conexão com o servidor...");
    const res = await fetch(`${config.API_URL}/salas`);
    console.log("Resposta do teste:", res.status);

    if (res.ok) {
      showFeedback("Conexão com o servidor estabelecida", "success");
      return true;
    } else {
      showFeedback(`Erro na conexão: ${res.status} ${res.statusText}`, "error");
      return false;
    }
  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    showFeedback(`Erro ao conectar: ${error.message}`, "error");
    return false;
  }
}

async function carregarSalas() {
  try {
    console.log("Iniciando carregamento de salas...");
    console.log("URL da API:", `${config.API_URL}/salas`);

    const res = await fetch(`${config.API_URL}/salas`);
    console.log("Resposta recebida:", res.status);

    if (!res.ok) {
      throw new Error(`Erro ao buscar salas: ${res.status} ${res.statusText}`);
    }

    const salas = await res.json();
    console.log("Salas recebidas:", salas);

    const lista = document.getElementById("lista");
    if (!lista) {
      console.error("Elemento 'lista' não encontrado no DOM");
      return;
    }

    lista.innerHTML = "";

    // Ordenar as salas pelo número de pessoas online (total) em ordem decrescente
    salas
      .sort((a, b) => b.total - a.total)
      .slice(0, 100)
      .forEach((sala) => {
        const btn = document.createElement("button");

        // Calcular o tempo restante no frontend
        const expiresAt = new Date(sala.expiresAt);
        const now = new Date();
        const timeLeft = expiresAt - now;

        // Formatar o tempo restante
        let timeLeftText = "";
        if (timeLeft > 0) {
          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutes = Math.floor(
            (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
          );

          if (hours > 0) {
            timeLeftText = `${hours}h ${minutes}min`;
          } else {
            timeLeftText = `${minutes}min`;
          }
        } else {
          timeLeftText = "Expirada";
          btn.disabled = true;
          btn.classList.add("opacity-50", "cursor-not-allowed");
        }

        const pessoasOnline = sala.total === 1 ? "pessoa" : "pessoas";
        btn.textContent = `${sala.name} (${sala.total} ${pessoasOnline}) - ${timeLeftText}`;
        btn.className =
          "block w-full text-left p-3 rounded bg-[#1f1f1f] text-white border border-gray-700 hover:bg-[#2c2c2c] transition";
        btn.onclick = () => {
          if (timeLeft <= 0) return;

          const salaId = sala.room || sala.name;
          const nomeDaSala = sala.name || salaId;

          localStorage.setItem("chat_room", salaId);
          localStorage.setItem("room_name", nomeDaSala);
          localStorage.setItem("user_name", "Anônimo");

          window.location.href = `index.html?id=${salaId}`;
        };

        lista.appendChild(btn);
      });

    console.log("Salas carregadas com sucesso!");
  } catch (error) {
    console.error("Erro ao carregar salas:", error);
    const lista = document.getElementById("lista");
    if (lista) {
      lista.innerHTML = `<div class="text-red-500 p-4">Erro ao carregar arenas: ${error.message}</div>`;
    }
  }
}

// Carrega as salas assim que a página carregar
window.onload = () => {
  console.log("Página carregada, iniciando carregamento de salas...");

  // Adicionar evento para o botão de teste de conexão
  const testarConexaoBtn = document.getElementById("testar-conexao");
  if (testarConexaoBtn) {
    testarConexaoBtn.addEventListener("click", testarConexao);
  }

  // Carregar salas
  carregarSalas();

  // Atualiza a quantidade de pessoas online a cada 5 segundos
  setInterval(carregarSalas, 5000);
};
