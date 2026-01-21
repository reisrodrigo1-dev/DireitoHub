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

// Configurações específicas por tipo de prompt
export const PROMPT_SPECIFIC_CONFIG = {
  'resumo-para-clientes': {
    model: 'gpt-3.5-turbo',
    maxTokens: 52500, // 15 partes × 3500 tokens = ~52.5k tokens
    chunkSize: 3500,
    temperature: 0.6,
    useRAG: false,
    ragConfig: {
      embeddingModel: 'text-embedding-ada-002',
      vectorStore: 'firebase',
      topK: 10,
      similarityThreshold: 0.8
    },
    chunkingStrategy: 'fixed',
    multiPartGeneration: true,
    numberOfParts: 15
  },
  'projeto-de-lei': {
    model: 'gpt-3.5-turbo',
    maxTokens: 31500, // 9 partes × 3500 tokens = ~31.5k tokens
    chunkSize: 3500,
    temperature: 0.7,
    useRAG: false,
    ragConfig: {
      embeddingModel: 'text-embedding-ada-002',
      vectorStore: 'firebase',
      topK: 8,
      similarityThreshold: 0.8
    },
    chunkingStrategy: 'fixed',
    multiPartGeneration: true,
    numberOfParts: 9
  },
  'apelacao-criminal': {
    model: 'gpt-3.5-turbo',
    maxTokens: 150000, // 43 partes × 3500 tokens = ~150.5k tokens
    chunkSize: 3500,
    temperature: 0.5, // Menor temperatura para maior consistência técnica
    useRAG: false,
    ragConfig: {
      embeddingModel: 'text-embedding-ada-002',
      vectorStore: 'firebase',
      topK: 15,
      similarityThreshold: 0.85
    },
    chunkingStrategy: 'fixed',
    multiPartGeneration: true,
    numberOfParts: 43
  },
  'contestacao': {
    model: 'gpt-3.5-turbo',
    maxTokens: 3000,
    chunkSize: 3000,
    temperature: 0.7,
    useRAG: false,
    chunkingStrategy: 'fixed'
  },
  'habeas-corpus': {
    model: 'gpt-3.5-turbo',
    maxTokens: 4000,
    chunkSize: 4000,
    temperature: 0.5,
    useRAG: false,
    ragConfig: {
      embeddingModel: 'text-embedding-ada-002',
      vectorStore: 'firebase',
      topK: 5,
      similarityThreshold: 0.85
    },
    chunkingStrategy: 'semantic'
  }
};

// Configurações de RAG global
export const RAG_CONFIG = {
  apiUrl: 'https://api.openai.com/v1/embeddings',
  firebaseCollection: 'documentChunks',
  chunkOverlap: 200,
  maxChunkSize: 1000
};
