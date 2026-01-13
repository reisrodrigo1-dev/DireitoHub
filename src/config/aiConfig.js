// Configurações da API de IA
export const AI_CONFIG = {
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  API_URL: 'https://api.openai.com/v1/chat/completions',
  MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: {
    ANALYSIS: 2000,
    PROMPT_PROCESSING: 3000,
    REGULAR_CHAT: 3000
  },
  TEMPERATURE: {
    ANALYSIS: 0.5,
    PROMPT_PROCESSING: 0.7,
    REGULAR_CHAT: 0.7
  }
};

// Configurações do sistema de prompts
export const PROMPT_CONFIG = {
  PROMPTS_PATH: '/prompts',
  FALLBACK_ENABLED: true,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutos
  SUPPORTED_EXTENSIONS: ['.txt', '.md', '.odt', '.docx', '.doc', '.pdf']
};

// Configurações do localStorage
export const STORAGE_CONFIG = {
  CHATS_KEY: 'juriAI_chats',
  PROMPTS_CACHE_KEY: 'juriAI_prompts_cache',
  MAX_CHATS_STORED: 100,
  AUTO_SAVE_INTERVAL: 30 * 1000 // 30 segundos
};

// Configurações da interface
export const UI_CONFIG = {
  MAX_MESSAGE_LENGTH: 5000,
  SCROLL_BEHAVIOR: 'smooth',
  TYPING_INDICATOR_DELAY: 1000,
  ERROR_RETRY_ATTEMPTS: 3,
  LOADING_TIMEOUT: 30 * 1000 // 30 segundos
};
