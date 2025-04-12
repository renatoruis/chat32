import { config } from "./config.js";

// Elementos do DOM
const statsContainer = document.getElementById("stats-container");
const graphContainer = document.getElementById("graph-container");
const backBtn = document.getElementById("back-btn");

// Histórico para o gráfico
let history = {
  pessoas: [],
  salas: [],
  mensagens: [],
};

// Variável para controlar se é a primeira carga
let isFirstLoad = true;

// Função para buscar estatísticas
async function fetchStats() {
  try {
    // Mostrar indicador de carregamento apenas na primeira vez
    if (isFirstLoad) {
      statsContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-[#00ff00]">></span>
          <span class="text-[#00ff00]">Conectando ao servidor...</span>
        </div>
      `;
    } else {
    }

    const response = await fetch(`${config.API_URL}/stats`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.details || `Erro ${response.status}: ${response.statusText}`
      );
    }

    const stats = await response.json();
    updateStatsDisplay(stats);
    updateGraph(stats);

    // Adicionar ao histórico
    history.pessoas.push(stats.totalPessoas);
    history.salas.push(stats.totalSalas);
    history.mensagens.push(stats.totalMensagens);

    // Manter apenas os últimos 10 valores
    if (history.pessoas.length > 10) {
      history.pessoas.shift();
      history.salas.shift();
      history.mensagens.shift();
    }

    // Marcar que não é mais a primeira carga
    isFirstLoad = false;

    return stats;
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);

    // Se for a primeira carga, mostrar mensagem de erro completa
    if (isFirstLoad) {
      statsContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-red-500">></span>
          <span class="text-red-500">Erro ao carregar estatísticas: ${error.message}</span>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <span class="text-[#00ff00]">></span>
          <span class="text-[#00ff00]">Tentando novamente em 5 segundos...</span>
        </div>
      `;
    } else {
      // Se não for a primeira carga, apenas adicionar uma mensagem de erro sem limpar o conteúdo
      const errorIndicator = document.createElement("div");
      errorIndicator.className = "flex items-center gap-2 opacity-0";
      errorIndicator.innerHTML = `
        <span class="text-red-500">></span>
        <span class="text-red-500">Erro na atualização: ${error.message}</span>
      `;
      statsContainer.insertBefore(errorIndicator, statsContainer.firstChild);

      // Fazer o indicador aparecer e desaparecer
      setTimeout(() => {
        errorIndicator.style.transition = "opacity 0.3s ease";
        errorIndicator.style.opacity = "1";
      }, 0);

      setTimeout(() => {
        errorIndicator.style.opacity = "0";
        setTimeout(() => {
          errorIndicator.remove();
        }, 300);
      }, 3000);
    }

    // Tentar novamente após 5 segundos
    setTimeout(fetchStats, 5000);
  }
}

// Função para atualizar a exibição das estatísticas
function updateStatsDisplay(stats) {
  const timestamp = new Date(stats.timestamp).toLocaleTimeString();

  // Se for a primeira carga, limpar o container
  if (isFirstLoad) {
    statsContainer.innerHTML = "";
  } else {
    // Se não for a primeira carga, apenas atualizar os valores existentes
    const existingLines = statsContainer.querySelectorAll(".stat-line");
    if (existingLines.length > 0) {
      // Atualizar valores existentes
      const lines = [
        { prefix: "Última atualização", value: timestamp },
        { prefix: "Salas ativas", value: stats.totalSalas },
        { prefix: "Pessoas online", value: stats.totalPessoas },
        { prefix: "Mensagens enviadas", value: stats.totalMensagens },
        { prefix: "Imagens compartilhadas", value: stats.totalImagens },
        { prefix: "Salas criadas hoje", value: stats.salasCriadasHoje },
      ];

      existingLines.forEach((line, index) => {
        if (index < lines.length) {
          const valueSpan = line.querySelector(".stat-value");
          if (valueSpan) {
            // Adicionar classe para efeito de destaque
            valueSpan.classList.add("highlight");
            valueSpan.textContent = lines[index].value;

            // Remover classe após a animação
            setTimeout(() => {
              valueSpan.classList.remove("highlight");
            }, 1000);
          }
        }
      });

      return;
    }
  }

  // Se não houver linhas existentes ou for a primeira carga, criar novas linhas
  const lines = [
    { prefix: "Última atualização", value: timestamp },
    { prefix: "Salas ativas", value: stats.totalSalas },
    { prefix: "Pessoas online", value: stats.totalPessoas },
    { prefix: "Mensagens enviadas", value: stats.totalMensagens },
    { prefix: "Imagens compartilhadas", value: stats.totalImagens },
    { prefix: "Salas criadas hoje", value: stats.salasCriadasHoje },
  ];

  lines.forEach((line, index) => {
    const lineElement = document.createElement("div");
    lineElement.className = "flex items-center gap-2 opacity-0 stat-line";
    lineElement.innerHTML = `
      <span class="text-[#00ff00]">></span>
      <span class="text-[#00ff00]">${line.prefix}: <span class="text-white stat-value">${line.value}</span></span>
    `;
    statsContainer.appendChild(lineElement);

    // Aplicar efeito de fade-in com delay
    setTimeout(() => {
      lineElement.style.transition = "opacity 0.3s ease";
      lineElement.style.opacity = "1";
    }, index * 100);
  });
}

// Função para atualizar o gráfico ASCII
function updateGraph(stats) {
  // Encontrar o valor máximo para escalar o gráfico
  const maxValue = Math.max(...history.pessoas, 1);
  const height = 5; // Altura do gráfico em linhas

  // Criar o gráfico de barras ASCII
  let graph = "   Pessoas Online\n";
  graph += "   ┌─────────────────────┐\n";

  // Preencher o gráfico com barras
  for (let i = height; i > 0; i--) {
    const threshold = (maxValue * i) / height;
    const barWidth = Math.floor((stats.totalPessoas / maxValue) * 20);

    graph += "   │";

    // Adicionar a barra
    for (let j = 0; j < 20; j++) {
      if (j < barWidth) {
        // Usar caracteres diferentes para criar um efeito mais interessante
        if (j % 3 === 0) {
          graph += "█";
        } else if (j % 3 === 1) {
          graph += "▓";
        } else {
          graph += "▒";
        }
      } else {
        graph += " ";
      }
    }

    graph += "│\n";
  }

  graph += "   └─────────────────────┘\n";
  graph += `   ${stats.totalPessoas} pessoas online`;

  // Adicionar uma linha de progresso
  const progressWidth = Math.floor((stats.totalPessoas / maxValue) * 20);
  graph += "\n\n   Progresso: [";
  for (let i = 0; i < 20; i++) {
    if (i < progressWidth) {
      graph += "=";
    } else if (i === progressWidth && progressWidth > 0) {
      graph += ">";
    } else {
      graph += " ";
    }
  }
  graph += "]";

  // Se não for a primeira carga, apenas atualizar o texto do pre existente
  if (!isFirstLoad && graphContainer.querySelector("pre")) {
    const preElement = graphContainer.querySelector("pre");
    preElement.textContent = graph;
    return;
  }

  // Limpar o container apenas na primeira carga
  graphContainer.innerHTML = "";

  // Criar o elemento pre
  const preElement = document.createElement("pre");
  preElement.className = "text-[#00ff00] opacity-0";
  preElement.textContent = graph;
  graphContainer.appendChild(preElement);

  // Aplicar efeito de fade-in
  setTimeout(() => {
    preElement.style.transition = "opacity 0.5s ease";
    preElement.style.opacity = "1";
  }, 300);
}

// Inicializar
async function init() {
  // Buscar estatísticas iniciais
  await fetchStats();

  // Atualizar a cada 5 segundos
  setInterval(async () => {
    await fetchStats();
  }, 5000);

  // Configurar botão de voltar
  backBtn.addEventListener("click", () => {
    window.location.href = "searcharenas.html";
  });
}

// Iniciar quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", init);
