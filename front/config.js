// Configurações do front-end
export const config = {
  // Endereço da API
  // API_URL: "http://localhost:3000",
  API_URL: "https://api.chat32.space",
  WS_API_URL: "wss://api.chat32.space",
  // Tempo de expiração da sala (em horas)
  ROOM_LIFETIME_HOURS: 1,

  // Limite de caracteres por mensagem
  MAX_MESSAGE_LENGTH: 32,

  // Limite de mensagens por sala
  MAX_MESSAGES_PER_ROOM: 16,

  // Tempo de verificação de expiração (em segundos)
  EXPIRATION_CHECK_INTERVAL: 15,

  // Tempo de atualização do contador (em segundos)
  COUNTDOWN_UPDATE_INTERVAL: 1,
};
