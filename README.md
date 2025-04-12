# Chat32

![Chat32](https://via.placeholder.com/800x400?text=Chat32)

## 📋 Sobre o Projeto

Chat32 é uma aplicação de chat em tempo real com interface inspirada em terminais de computador. O sistema permite a criação de salas de chat temporárias, compartilhamento de mensagens de texto, emojis e imagens, com um design minimalista e nostálgico.

## ✨ Características

- **Interface estilo terminal**: Design inspirado em terminais de computador com cores verde sobre preto
- **Salas temporárias**: Criação de salas de chat que expiram automaticamente após 1 hora
- **Compartilhamento de mídia**: Suporte para envio de imagens e emojis
- **Estatísticas em tempo real**: Página oculta com estatísticas do sistema
- **Limite diário**: Controle de criação de salas para evitar abusos
- **Responsivo**: Funciona em dispositivos móveis e desktop

## 🛠️ Tecnologias Utilizadas

### Backend

- **Node.js**: Ambiente de execução JavaScript
- **Express**: Framework web para Node.js
- **WebSocket**: Comunicação em tempo real
- **Redis**: Armazenamento de dados e gerenciamento de sessões
- **Multer**: Upload de arquivos

### Frontend

- **JavaScript**: Linguagem de programação
- **Tailwind CSS**: Framework CSS para estilização
- **Emoji Mart**: Seletor de emojis
- **WebSocket API**: Comunicação em tempo real com o servidor

## 🚀 Como Executar

### Pré-requisitos

- Node.js (v14 ou superior)
- Redis Server
- NPM ou Yarn

### Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/corrente-chat.git
cd corrente-chat
```

2. Instale as dependências:

```bash
# Instalar dependências do backend
cd back
npm install

# Instalar dependências do frontend
cd ../front
npm install
```

3. Configure as variáveis de ambiente:
   Crie um arquivo `.env` na pasta `back` com o seguinte conteúdo:

```
PORT=3000
REDIS_URL=redis://localhost:6379
```

4. Inicie o servidor Redis:

```bash
redis-server
```

5. Inicie o servidor backend:

```bash
cd back
npm start
```

6. Sirva os arquivos frontend:
   Você pode usar qualquer servidor HTTP estático. Por exemplo, com o `http-server`:

```bash
cd front
npx http-server
```

7. Acesse a aplicação:
   Abra seu navegador e acesse `http://localhost:8080`

## 📁 Estrutura do Projeto

```
corrente-chat/
├── back/                  # Código do servidor
│   ├── handlers/          # Manipuladores de eventos
│   ├── services/          # Serviços (Redis, armazenamento, etc.)
│   ├── uploads/           # Diretório para imagens enviadas
│   └── server.js          # Ponto de entrada do servidor
├── front/                 # Código do cliente
│   ├── static/            # Arquivos estáticos (CSS, JS)
│   ├── core/              # Módulos principais do frontend
│   ├── index.html         # Página principal
│   ├── searcharenas.html  # Página de busca de arenas
│   ├── listarenas.html    # Página de listagem de arenas
│   └── stats.html         # Página de estatísticas (oculta)
└── README.md              # Este arquivo
```

## 🔍 Funcionalidades Detalhadas

### Criação de Salas

- As salas são criadas com nomes de até 8 caracteres
- Cada sala expira automaticamente após 1 hora
- Existe um limite diário de 100 salas por dia

### Chat em Tempo Real

- Mensagens são enviadas e recebidas instantaneamente
- Suporte para emojis através do Emoji Mart
- Compartilhamento de imagens com limite de 5MB
- Limite de 32 caracteres por mensagem

### Estatísticas

- Página oculta com estatísticas em tempo real
- Contagem de salas ativas, pessoas online, mensagens enviadas
- Gráfico ASCII de pessoas online
- Atualização automática a cada 5 segundos

## 🔒 Segurança

- Validação de entrada de dados no servidor
- Limites de tamanho para mensagens e imagens
- Expiração automática de salas para evitar acúmulo de dados
- Sanitização de dados para prevenir injeção de código

## 🎨 Personalização

O sistema pode ser personalizado através dos seguintes arquivos:

- `front/config.js`: Configurações do frontend (URL da API, limites, etc.)
- `front/static/style.css`: Estilos globais
- `back/server.js`: Configurações do servidor

## 📝 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## 👥 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## 📞 Contato

Para dúvidas ou sugestões, entre em contato através de [seu-email@exemplo.com](mailto:seu-email@exemplo.com).
