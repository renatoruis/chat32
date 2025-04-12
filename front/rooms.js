import { config } from "./config.js";
import { showFeedback } from "./core/feedback.js";

// Verificar conexão com o servidor
async function verificarConexaoServidor() {
  try {
    console.log("Verificando conexão com o servidor:", config.API_URL);
    // Usar o endpoint /salas que sabemos que existe
    const res = await fetch(`${config.API_URL}/salas`);
    console.log("Status da conexão:", res.status);
    return res.ok;
  } catch (error) {
    console.error("Erro ao verificar conexão com o servidor:", error);
    return false;
  }
}

// Função para buscar salas
async function buscarSalas() {
  try {
    const response = await fetch(`${config.API_URL}/salas`);
    if (!response.ok) {
      throw new Error("Erro ao buscar salas");
    }
    const salas = await response.json();
    return salas;
  } catch (error) {
    showFeedback("Erro ao buscar salas: " + error.message, "error");
    console.error(error);
    return [];
  }
}

// Função para verificar limite diário
async function verificarLimiteDiario() {
  try {
    const response = await fetch(`${config.API_URL}/salas/limite`);
    if (!response.ok) {
      throw new Error("Erro ao verificar limite diário");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    return { limite: 0, criadas: 0 };
  }
}

// Configurar eventos apenas se estivermos na página de busca de arenas
if (document.getElementById("search")) {
  document.getElementById("search").addEventListener("input", buscarSalas);
}

if (document.getElementById("open-modal")) {
  document.getElementById("open-modal").addEventListener("click", () => {
    document.getElementById("modal").classList.remove("hidden");
    document.getElementById("nova-sala").value = "";
    document.getElementById("erro").classList.add("hidden");
  });
}

if (document.getElementById("cancelar")) {
  document.getElementById("cancelar").addEventListener("click", () => {
    document.getElementById("modal").classList.add("hidden");
  });
}

// Função para criar nova sala
async function criarSala(nome) {
  try {
    console.log("Criando sala com nome:", nome);
    console.log("URL da API:", `${config.API_URL}/salas`);

    const response = await fetch(`${config.API_URL}/salas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: nome }),
    });

    console.log("Status da resposta:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro retornado pelo servidor:", errorData);
      throw new Error(errorData.error || "Erro ao criar sala");
    }

    const data = await response.json();
    console.log("Resposta do servidor:", data);
    return data;
  } catch (error) {
    showFeedback("Erro ao criar sala: " + error.message, "error");
    console.error("Erro completo:", error);
    return null;
  }
}

if (document.getElementById("criar-sala")) {
  const criarSalaBtn = document.getElementById("criar-sala");
  const form = document.getElementById("criar-sala-form");
  const novaSalaInput = document.getElementById("nova-sala");
  const erro = document.getElementById("erro");

  const handleCriarSala = async () => {
    console.log("Função handleCriarSala iniciada");

    const nome = novaSalaInput.value.trim();
    console.log("Nome da sala a ser criada:", nome);

    if (!nome) {
      erro.textContent = "Nome obrigatório";
      erro.classList.remove("hidden");
      return;
    }

    if (nome.length > 8) {
      erro.textContent = "Máximo de 8 caracteres";
      erro.classList.remove("hidden");
      return;
    }

    // Desabilitar o botão durante a criação
    criarSalaBtn.disabled = true;
    criarSalaBtn.textContent = "Criando...";

    try {
      // Mostrar mensagem de processamento
      form.innerHTML = `
        <div class="text-[#00ff00] text-center py-4">
          <p class="mb-2">⏳ Criando arena...</p>
        </div>
      `;

      // Criar a sala com o nome fornecido
      console.log("Chamando função criarSala");
      const resultado = await criarSala(nome);
      console.log("Resultado da criação:", resultado);

      if (!resultado) {
        throw new Error("Falha ao criar a arena");
      }

      // Mostrar mensagem de sucesso
      form.innerHTML = `
        <div class="text-[#00ff00] text-center py-4">
          <p class="mb-2">✅ Arena criada com sucesso!</p>
          <p class="text-sm">Redirecionando para a arena...</p>
        </div>
      `;

      // Salvar o nome da sala retornado pelo servidor e redirecionar após um breve delay
      const salaId = resultado.room;
      const nomeDaSala = resultado.name || salaId;

      localStorage.setItem("chat_room", salaId);
      localStorage.setItem("room_name", nomeDaSala);
      localStorage.setItem("user_name", "Anônimo");

      setTimeout(() => {
        window.location.href = `index.html?id=${salaId}`;
      }, 1000);
    } catch (error) {
      console.error("Erro ao criar arena:", error);

      // Restaurar o formulário
      form.innerHTML = `
        <div>
          <label for="nova-sala" class="block text-[#00ff00] text-sm mb-1">Nome da arena (máx. 8 caracteres)</label>
          <input
            id="nova-sala"
            type="text"
            maxlength="8"
            class="w-full bg-black border border-[#006600] text-[#00ff00] p-2 rounded focus:outline-none focus:border-[#00ff00]"
            value="${nome}"
          />
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            id="criar-sala"
            class="bg-[#006600] text-[#00ff00] px-4 py-2 rounded hover:bg-[#008800] transition-colors"
          >
            Criar
          </button>
        </div>
        <p id="erro" class="text-red-500 mt-2">${
          error.message || "Erro ao conectar com o servidor"
        }</p>
      `;

      // Reativar o botão e seu evento
      const novoCriarSalaBtn = document.getElementById("criar-sala");
      if (novoCriarSalaBtn) {
        novoCriarSalaBtn.disabled = false;
        novoCriarSalaBtn.textContent = "Criar";
        novoCriarSalaBtn.addEventListener("click", handleCriarSala);
      }
    }
  };

  // Adicionar evento ao botão
  criarSalaBtn.addEventListener("click", handleCriarSala);

  // Adicionar evento de submit ao formulário
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleCriarSala();
  });
}

window.onload = () => {
  console.log("Página carregada");

  // A lista só será carregada quando o usuário digitar algo no campo de busca
  const searchInput = document.getElementById("search");
  if (searchInput) {
    searchInput.focus();
  }

  // Verificar o limite diário sem mostrar notificação
  verificarLimiteDiario();

  // Adicionar evento para o botão de teste de conexão
  const testarConexaoBtn = document.getElementById("testar-conexao");
  if (testarConexaoBtn) {
    testarConexaoBtn.addEventListener("click", async () => {
      const conectado = await verificarConexaoServidor();
      if (conectado) {
        showFeedback("Conexão com o servidor estabelecida", "success");
      } else {
        showFeedback("Não foi possível conectar ao servidor", "error");
      }
    });
  }
};
