// Serviço para integração com IA
import { AI_CONFIG } from '../config/aiConfig';

const { API_KEY, API_URL, MODEL, MAX_TOKENS, TEMPERATURE } = AI_CONFIG;

// Função helper para tratar erros da API OpenAI
const handleAPIError = async (response) => {
  const errorData = await response.json().catch(() => ({}));
  console.error('❌ Erro da API OpenAI:', response.status, errorData);
  
  // Tratamento específico para diferentes tipos de erro
  if (response.status === 403) {
    throw new Error('❌ API Key inválida ou sem permissão. Verifique sua chave da OpenAI no arquivo .env');
  } else if (response.status === 401) {
    throw new Error('❌ API Key não configurada ou inválida. Configure VITE_OPENAI_API_KEY no arquivo .env');
  } else if (response.status === 429) {
    throw new Error('⏱️ Limite de requisições excedido. Tente novamente em alguns minutos.');
  } else if (response.status === 400) {
    throw new Error('❌ Requisição inválida. Verifique os parâmetros enviados.');
  } else {
    throw new Error(`❌ Erro da API OpenAI: ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`);
  }
};

// Validação da API Key
const validateAPIKey = () => {
  if (!API_KEY || API_KEY.trim() === '') {
    throw new Error('❌ API Key da OpenAI não configurada. Configure VITE_OPENAI_API_KEY no arquivo .env');
  }
};

// Função para enviar mensagem para IA
export const sendMessageToAI = async (messages, promptType = null) => {
  try {
    validateAPIKey();
    
    let systemMessage = {
      role: 'system',
      content: 'Você é um assistente jurídico especializado em direito brasileiro. Você deve fornecer respostas precisas, fundamentadas e em linguagem jurídica adequada. Sempre cite as leis, artigos e jurisprudências relevantes quando possível.'
    };

    // Personalizar mensagem do sistema baseada no tipo de prompt
    if (promptType) {
      systemMessage.content = getSystemMessageForPromptType(promptType);
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, ...messages],
        max_tokens: MAX_TOKENS.REGULAR_CHAT,
        temperature: TEMPERATURE.REGULAR_CHAT,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('Erro ao comunicar com IA:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para obter mensagem do sistema personalizada por tipo de prompt
const getSystemMessageForPromptType = (promptType) => {
  const promptMessages = {
    'acrescentar-argumentos': 'Você é um especialista em argumentação jurídica. Sua função é analisar peças processuais e sugerir argumentos sólidos, fundamentados em lei, doutrina e jurisprudência. Sempre cite as fontes legais relevantes.',
    
    'agravo-instrumento': 'Você é um especialista em recursos processuais, especificamente agravos de instrumento. Analise as decisões interlocutórias e elabore agravos fundamentados, citando os requisitos legais e jurisprudência aplicável.',
    
    'analisar-laudos': 'Você é um especialista em análise de laudos médicos para processos judiciais. Analise tecnicamente os laudos, identifique pontos relevantes para o caso e sugira questionamentos ou esclarecimentos necessários.',
    
    'busca-jurisprudencia': 'Você é um especialista em pesquisa jurisprudencial. Busque precedentes relevantes, analise a aplicabilidade aos casos concretos e forneça citações precisas de tribunais superiores.',
    
    'contestacao': 'Você é um especialista em defesa processual. Elabore contestações fundamentadas, analisando cada pedido da inicial e apresentando defesas processuais e de mérito adequadas.',
    
    'apelacao-criminal': 'Você é um especialista em direito criminal e recursos. Elabore apelações criminais fundamentadas, analisando provas, dosimetria, nulidades e demais questões penais relevantes.',
    
    'habeas-corpus': 'Você é um especialista em direito processual penal e habeas corpus. Analise situações de constrangimento ilegal e elabore impetrações fundamentadas com urgência e precisão jurídica.',
    
    'dosimetria-pena': 'Você é um especialista em direito penal e dosimetria. Analise a aplicação da pena conforme as fases da dosimetria, considerando circunstâncias judiciais, agravantes, atenuantes e causas especiais.',
    
    'correcao-portugues': 'Você é um especialista em revisão de textos jurídicos. Corrija erros gramaticais, melhore a clareza e fluidez, mantendo o rigor técnico e a linguagem jurídica adequada.',
    
    'linguagem-simples': 'Você é um especialista em comunicação jurídica acessível. Converta textos jurídicos complexos para linguagem simples e compreensível, mantendo a precisão técnica.',
    
    'memoriais-criminais': 'Você é um especialista em elaboração de memoriais criminais. Organize argumentos de forma clara e persuasiva, destacando pontos centrais da defesa ou acusação.',
    
    'inicial-alimentos': 'Você é um especialista em direito de família. Elabore ações de alimentos fundamentadas, considerando necessidade, possibilidade e proporcionalidade.',
    
    'resumo-cliente': 'Você é um especialista em comunicação jurídica com clientes. Elabore resumos claros e acessíveis sobre processos, usando linguagem simples sem perder precisão jurídica.',
    
    'inserir-fundamentos': 'Você é um especialista em fundamentação jurídica. Identifique e insira fundamentos legais, doutrinas e jurisprudências relevantes para fortalecer argumentações.',
    
    'maximizar-impacto': 'Você é um especialista em retórica jurídica. Aprimore textos para maximizar impacto persuasivo, mantendo rigor técnico e elegância argumentativa.',
    
    'rebater-argumentos': 'Você é um especialista em contra-argumentação jurídica. Analise argumentos contrários e elabore teses sólidas para rebatê-los, com fundamentação legal consistente.'
  };

  return promptMessages[promptType] || 'Você é um assistente jurídico especializado em direito brasileiro. Forneça respostas precisas, fundamentadas e em linguagem jurídica adequada.';
};

// Função para validar chave da API
export const validateApiKey = async () => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao validar chave da API:', error);
    return false;
  }
};

// Função para contar tokens (estimativa)
export const estimateTokens = (text) => {
  return Math.ceil(text.length / 4); // Aproximação: 1 token ≈ 4 caracteres
};

// Função para formatar mensagens para OpenAI
export const formatMessagesForOpenAI = (chatHistory) => {
  return chatHistory
    .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message
    }));
};

// Função para analisar prompt e solicitar informações necessárias
export const analyzePromptAndRequestInfo = async (promptType, promptContent) => {
  try {
    const analysisMessage = {
      role: 'system',
      content: `Você é um assistente jurídico especializado. Analise o seguinte prompt/template jurídico e identifique quais informações específicas o advogado precisa fornecer para que você possa executar esta tarefa adequadamente.

Template/Prompt: ${promptContent || promptType.description}

Tipo de assistente: ${promptType.name}
Categoria: ${promptType.category}

Sua resposta deve:
1. Cumprimentar o advogado explicando sua especialização
2. Listar de forma clara e organizada todas as informações necessárias
3. Explicar por que cada informação é importante
4. Usar linguagem profissional mas acessível
5. Ser específico sobre formatos ou detalhes esperados

Formato da resposta:
- Seja direto e objetivo
- Use bullet points para listar informações
- Inclua exemplos quando necessário
- Mantenha tom profissional e útil`
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [analysisMessage],
        max_tokens: MAX_TOKENS.ANALYSIS,
        temperature: TEMPERATURE.ANALYSIS,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('Erro ao analisar prompt:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para processar informações do usuário com o prompt específico
export const processUserInputWithPrompt = async (userInput, promptType, promptContent) => {
  try {
    const systemMessage = {
      role: 'system',
      content: `Você é um assistente jurídico especializado em ${promptType.name}. 

Template/Prompt a ser seguido:
${promptContent || `Especialize-se em ${promptType.description}`}

Instruções:
1. Use as informações fornecidas pelo advogado
2. Siga exatamente o template/prompt fornecido
3. Mantenha linguagem jurídica apropriada
4. Seja preciso e fundamentado
5. Cite leis, artigos e jurisprudências quando aplicável
6. Forneça resultado prático e utilizável

Informações fornecidas pelo advogado:
${userInput}

Agora execute o prompt/template com base nas informações fornecidas:`
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage],
        max_tokens: MAX_TOKENS.PROMPT_PROCESSING,
        temperature: TEMPERATURE.PROMPT_PROCESSING,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('Erro ao processar input com prompt:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para validar informações do usuário
export const validateUserInput = (userInput, promptType) => {
  const minLength = 20;
  const maxLength = 5000;
  
  // Validações básicas
  if (!userInput || typeof userInput !== 'string') {
    return {
      isValid: false,
      error: 'Por favor, forneça as informações solicitadas.'
    };
  }
  
  if (userInput.trim().length < minLength) {
    return {
      isValid: false,
      error: `As informações devem ter pelo menos ${minLength} caracteres para um resultado adequado.`
    };
  }
  
  if (userInput.length > maxLength) {
    return {
      isValid: false,
      error: `As informações não podem exceder ${maxLength} caracteres.`
    };
  }
  
  // Validações específicas por tipo de prompt
  const specificValidation = validateSpecificPrompt(userInput, promptType);
  if (!specificValidation.isValid) {
    return specificValidation;
  }
  
  return {
    isValid: true,
    error: null
  };
};

// Validações específicas por tipo de prompt
const validateSpecificPrompt = (userInput, promptType) => {
  const input = userInput.toLowerCase();
  
  switch (promptType.id) {
    case 'habeas-corpus':
      if (!input.includes('paciente') && !input.includes('nome')) {
        return {
          isValid: false,
          error: 'Para Habeas Corpus, é necessário informar pelo menos os dados do paciente.'
        };
      }
      break;
      
    case 'contestacao':
      if (!input.includes('processo') && !input.includes('autor')) {
        return {
          isValid: false,
          error: 'Para Contestação, é necessário informar pelo menos os dados do processo e autor.'
        };
      }
      break;
      
    case 'apelacao-criminal':
    case 'apelacao-trabalhista':
      if (!input.includes('sentença') && !input.includes('decisão')) {
        return {
          isValid: false,
          error: 'Para Apelação, é necessário informar dados sobre a sentença ou decisão recorrida.'
        };
      }
      break;
      
    case 'busca-de-jurisprudencia':
      if (!input.includes('tema') && !input.includes('assunto')) {
        return {
          isValid: false,
          error: 'Para Busca de Jurisprudência, especifique o tema ou assunto da pesquisa.'
        };
      }
      break;
      
    default:
      // Validação geral para outros tipos
      break;
  }
  
  return {
    isValid: true,
    error: null
  };
};

// Função para sugerir informações adicionais
export const suggestAdditionalInfo = (userInput, promptType) => {
  const suggestions = [];
  const input = userInput.toLowerCase();
  
  // Sugestões gerais
  if (!input.includes('urgente') && !input.includes('prazo')) {
    suggestions.push('Considere informar se há urgência ou prazos específicos.');
  }
  
  if (!input.includes('documento') && !input.includes('prova')) {
    suggestions.push('Mencione se possui documentos ou provas relevantes.');
  }
  
  // Sugestões específicas por tipo
  switch (promptType.id) {
    case 'habeas-corpus':
      if (!input.includes('prisão') && !input.includes('constrangimento')) {
        suggestions.push('Descreva detalhadamente o tipo de constrangimento ou prisão.');
      }
      break;
      
    case 'contestacao':
      if (!input.includes('defesa') && !input.includes('estratégia')) {
        suggestions.push('Informe sua estratégia defensiva ou teses a serem sustentadas.');
      }
      break;
  }
  
  return suggestions;
};

// Função para gerar primeira pergunta baseada no prompt
export const generateFirstQuestion = async (promptType, promptContent) => {
  try {
    console.log('Gerando primeira pergunta...', { 
      promptType: promptType?.name || 'Unknown', 
      hasContent: !!promptContent 
    });
    console.log('API Key disponível:', !!API_KEY);
    
    if (!API_KEY) {
      throw new Error('API Key não configurada');
    }

    // Verificar se precisa de documentos
    const { requiresMandatoryDocument, canBenefitFromDocument, getDocumentRequestMessage } = require('./promptDocumentConfig');
    const requiresDoc = requiresMandatoryDocument(promptType?.id, promptType?.name);
    const canBenefit = canBenefitFromDocument(promptType?.id, promptType?.name);
    
    let documentInstruction = '';
    if (requiresDoc) {
      documentInstruction = `\n\nIMPORTANTE: Este assistente REQUER documentos para funcionar adequadamente. Inclua na sua primeira mensagem uma orientação clara sobre qual documento é necessário e como o usuário pode anexá-lo.`;
    } else if (canBenefit) {
      documentInstruction = `\n\nDICA: Este assistente funciona melhor com documentos de apoio. Mencione que o usuário pode anexar documentos para uma análise mais precisa.`;
    }

    // Limitar o tamanho do conteúdo do prompt para evitar erro 400
    const limitedContent = (promptContent || promptType?.description || 'Assistência jurídica').substring(0, 1500);

    const questionMessage = {
      role: 'system',
      content: `Você é um assistente jurídico especializado em ${promptType?.name || 'assistência jurídica'}. 

Baseado no seguinte template/prompt:
${limitedContent}
${documentInstruction}

Sua tarefa é iniciar um diálogo estruturado com o advogado para coletar todas as informações necessárias.

INSTRUÇÕES IMPORTANTES:
1. Cumprimente o advogado de forma profissional
2. Explique brevemente o que você fará
3. INFORME QUANTAS PERGUNTAS SERÃO FEITAS (entre 3 a 5 perguntas)
4. Faça APENAS A PRIMEIRA PERGUNTA mais importante e específica
5. A pergunta deve ser direcionada ao template/prompt específico
6. Use linguagem clara e profissional
7. Numere a pergunta (ex: "Pergunta 1 de 4:")

EVITE:
- Perguntas muito amplas
- Múltiplas perguntas em uma mensagem
- Perguntas genéricas
- Repetir informações do template

Formato da resposta:
- Cumprimento breve
- Explicação do processo com número total de perguntas
- UMA pergunta específica numerada
- Orientação clara sobre como responder

Exemplo de estrutura:
"Olá! Sou seu assistente especializado em ${promptType.name}. Vou coletar as informações necessárias através de 4 perguntas direcionadas.

Pergunta 1 de 4: [pergunta específica sobre algo essencial do template]

[Orientação específica sobre como responder]"`
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [questionMessage],
        max_tokens: MAX_TOKENS.ANALYSIS,
        temperature: TEMPERATURE.ANALYSIS,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    console.log('Primeira pergunta gerada com sucesso');
    return {
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('Erro ao gerar primeira pergunta:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para gerar próxima pergunta baseada no contexto
export const generateNextQuestion = async (promptType, promptContent, collectedData, conversationHistory, attachedDocuments = []) => {
  try {
    // Validação defensiva dos parâmetros
    const safeCollectedData = collectedData || [];
    const safeConversationHistory = conversationHistory || [];
    const safeAttachedDocuments = attachedDocuments || [];
    
    console.log('Gerando próxima pergunta...', { 
      promptType: promptType?.name || 'Unknown', 
      hasContent: !!promptContent,
      collectedDataLength: safeCollectedData.length,
      conversationLength: safeConversationHistory.length,
      documentsCount: safeAttachedDocuments.length
    });
    
    if (!API_KEY) {
      throw new Error('API Key não configurada');
    }

    // Limitar o tamanho do contexto para evitar erro 400
    const limitedHistory = safeConversationHistory.slice(-10); // Últimas 10 mensagens
    const limitedData = safeCollectedData.slice(-8); // Últimas 8 informações coletadas
    
    // Preparar contexto dos documentos anexados
    let documentsContext = '';
    if (safeAttachedDocuments.length > 0) {
      documentsContext = `\n\nDOCUMENTOS ANEXADOS (${safeAttachedDocuments.length}):
${safeAttachedDocuments.map((doc, index) => 
  `${index + 1}. **${doc.fileName}** (${doc.fileType.toUpperCase()}, ${doc.wordCount} palavras)
Conteúdo: ${doc.content.substring(0, 2000)}${doc.content.length > 2000 ? '...' : ''}`
).join('\n\n')}

IMPORTANTE: Os documentos anexados contêm informações essenciais para a análise. Use-os como base para suas perguntas e análise.`;
    }
    
    const contextMessage = {
      role: 'system',
      content: `Você é um assistente jurídico especializado em ${promptType?.name || 'assistência jurídica'}.

Template/Prompt que você deve seguir:
${(promptContent || promptType.description).substring(0, 1500)}

Informações já coletadas (${limitedData.length} mais recentes):
${JSON.stringify(limitedData, null, 2)}

Histórico da conversa (${limitedHistory.length} mensagens mais recentes):
${limitedHistory.map(msg => `${msg.role}: ${msg.content.substring(0, 300)}`).join('\n')}
${documentsContext}

INSTRUÇÕES IMPORTANTES:
1. Analise cuidadosamente as informações já coletadas
2. Verifique se a última pergunta foi respondida adequadamente
3. Identifique qual informação REALMENTE ainda falta para executar o template
4. Se já tem informações suficientes, diga que está pronto para gerar
5. NUNCA repita perguntas já feitas ou informações já coletadas
6. Seja específico sobre o que ainda precisa
7. Continue a numeração das perguntas baseada no número de informações coletadas

Critérios para decidir:
- Se já tem informações suficientes para executar o template: "Tenho todas as informações necessárias. Posso gerar seu [tipo de documento]. Digite 'GERAR' para prosseguir."
- Se falta informação essencial: faça UMA pergunta específica numerada (ex: "Pergunta ${limitedData.length + 1}:")
- Se a resposta anterior foi incompleta: peça esclarecimento específico

Formato da resposta:
- Uma pergunta específica numerada sobre informação que ainda falta OU
- Confirmação de que pode gerar o resultado

EVITE:
- Perguntas repetitivas
- Perguntas sobre informações já coletadas
- Perguntas genéricas demais
- Múltiplas perguntas de uma vez`
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [contextMessage],
        max_tokens: MAX_TOKENS.ANALYSIS,
        temperature: 0.3, // Reduzir para ser mais determinístico
        top_p: 0.9,
        frequency_penalty: 0.5, // Penalizar repetições
        presence_penalty: 0.3   // Encorajar novos tópicos
      })
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content;
    
    if (!generatedContent || generatedContent.trim() === '') {
      console.warn('⚠️ API retornou conteúdo vazio, usando fallback');
      throw new Error('Conteúdo vazio retornado pela API');
    }
    
    console.log('Próxima pergunta gerada com sucesso');
    return {
      success: true,
      message: generatedContent,
      usage: data.usage
    };
  } catch (error) {
    console.error('Erro ao gerar próxima pergunta:', error);
    
    // Fallback robusto para garantir que sempre há uma resposta
    const safeCollectedData = collectedData || [];
    const questionNumber = safeCollectedData.length + 1;
    
    let fallbackMessage;
    if (safeCollectedData.length >= 3) {
      // Se já coletou bastante informação, sugerir gerar resultado
      fallbackMessage = `Com base nas informações que você já forneceu (${safeCollectedData.length} itens), tenho dados suficientes para gerar um resultado inicial. 

Digite "GERAR" para prosseguir ou continue fornecendo mais detalhes sobre seu caso.`;
    } else {
      // Pergunta genérica mas útil baseada no tipo de prompt
      const promptName = promptType?.name || 'documento jurídico';
      fallbackMessage = `Pergunta ${questionNumber}: Para elaborar seu ${promptName}, preciso de mais informações específicas sobre o caso. 

Por favor, descreva em detalhes:
- O contexto da situação
- As partes envolvidas  
- Os fatos relevantes
- O que você busca alcançar

Quanto mais detalhes você fornecer, melhor será o resultado final.`;
    }
    
    return {
      success: true,
      message: fallbackMessage,
      isComplete: false,
      isFallback: true,
      error: error.message
    };
  }
};

// Função para gerar resultado final com todas as informações coletadas
export const generateFinalResult = async (promptType, promptContent, collectedData, conversationHistory, attachedDocuments = []) => {
  try {
    console.log('🎯 Iniciando geração do resultado final...', {
      promptType: promptType?.name,
      hasContent: !!promptContent,
      collectedDataLength: collectedData?.length || 0,
      conversationLength: conversationHistory?.length || 0
    });

    // Verificar se API Key está configurada - se não, usar fallback diretamente
    console.log('🔑 Verificando API Key:', {
      hasApiKey: !!API_KEY,
      keyLength: API_KEY?.length || 0,
      keyPrefix: API_KEY?.substring(0, 7) || 'N/A'
    });
    
    if (!API_KEY || API_KEY.trim() === '') {
      console.log('⚠️ API Key não configurada, usando resultado fallback...');
      return generateFallbackResult(promptType, collectedData);
    }

    // Validação da API Key
    try {
      validateAPIKey();
      
      // Testar conectividade antes de prosseguir
      const isAPIWorking = await testAPIConnection();
      if (!isAPIWorking) {
        console.log('⚠️ API não está funcionando, usando fallback...');
        return generateFallbackResult(promptType, collectedData);
      }
    } catch (error) {
      console.log('⚠️ Erro na validação da API:', error.message);
      return generateFallbackResult(promptType, collectedData);
    }

    // Validar parâmetros de entrada
    if (!promptType || !promptType.name) {
      throw new Error('promptType inválido');
    }
    
    if (!Array.isArray(collectedData)) {
      throw new Error('collectedData deve ser um array');
    }
    
    if (!Array.isArray(conversationHistory)) {
      throw new Error('conversationHistory deve ser um array');
    }

    if (collectedData.length === 0) {
      console.warn('⚠️ Nenhuma informação coletada, usando fallback...');
      return generateFallbackResult(promptType, collectedData);
    }

    console.log('📋 Dados coletados:', collectedData);
    console.log('💬 Histórico da conversa:', conversationHistory.slice(-3));

    // Preparar informações coletadas de forma mais resumida
    const collectedInfo = collectedData.map((item, index) => {
      const question = (item.question || 'Pergunta').substring(0, 100);
      const answer = (item.answer || 'Sem resposta').substring(0, 300);
      return `${index + 1}. ${question}: ${answer}`;
    }).join('\n');

    console.log('📝 Informações formatadas:', collectedInfo);

    // Preparar contexto dos documentos anexados
    const safeAttachedDocuments = attachedDocuments || [];
    let documentsSection = '';
    if (safeAttachedDocuments.length > 0) {
      documentsSection = `\n\nDOCUMENTOS ANEXADOS:
${safeAttachedDocuments.map((doc, index) => 
  `${index + 1}. **${doc.fileName}** (${doc.fileType.toUpperCase()})
${doc.content.substring(0, 3000)}${doc.content.length > 3000 ? '...' : ''}`
).join('\n\n')}

IMPORTANTE: Use os documentos anexados como base principal para a análise e geração do resultado.`;
      
      console.log('📄 Documentos incluídos no contexto:', safeAttachedDocuments.length);
    }

    // Usar apenas as últimas 3 mensagens do histórico para economizar tokens
    const recentHistory = conversationHistory
      .slice(-3)
      .filter(msg => msg.role && msg.content)
      .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content.substring(0, 200)}`)
      .join('\n');

    // Limitar drasticamente o tamanho do prompt content
    const truncatedPromptContent = promptContent 
      ? promptContent.substring(0, 1500) + (promptContent.length > 1500 ? '...' : '')
      : promptType.description;

    // Criar mensagem mais concisa
    const systemMessage = {
      role: 'system',
      content: `Você é um assistente jurídico especializado em ${promptType.name}.

TEMPLATE/PROMPT:
${truncatedPromptContent}

INFORMAÇÕES COLETADAS:
${collectedInfo}
${documentsSection}

INSTRUÇÕES:
- Use TODAS as informações coletadas
- Se há documentos anexados, analise-os cuidadosamente e use como base principal
- Siga o template fornecido
- Gere resultado completo e profissional
- Mantenha linguagem jurídica adequada
- Seja estruturado e detalhado`
    };

    const userMessage = {
      role: 'user',
      content: `Com base nas informações coletadas, gere o resultado final completo para ${promptType.name}. Dados: ${collectedData.length} respostas coletadas.`
    };

    const messages = [systemMessage, userMessage];

    // Estimar tokens (aproximadamente 4 caracteres por token)
    const estimatedTokens = JSON.stringify(messages).length / 4;
    console.log('Tokens estimados:', estimatedTokens);

    if (estimatedTokens > 12000) {
      throw new Error('Conteúdo muito grande para processar. Tente novamente com menos informações.');
    }

    console.log('Enviando requisição para gerar resultado final:', {
      promptType: promptType.name,
      collectedDataLength: collectedData.length,
      estimatedTokens: estimatedTokens
    });

    console.log('🚀 Enviando requisição para OpenAI...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 3000, // Respostas mais completas mantendo compatibilidade
        temperature: 0.3, // Reduzido para respostas mais consistentes
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    console.log('📨 Resposta recebida:', response.status, response.ok);

    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status);
      await handleAPIError(response);
    }

    const data = await response.json();
    console.log('✅ Resultado final gerado com sucesso:', data.choices?.[0]?.message?.content?.substring(0, 200) + '...');
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Resposta inválida da API OpenAI');
    }
    
    return {
      success: true,
      message: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error('❌ Erro ao gerar resultado final:', error);
    console.error('📍 Stack trace:', error.stack);
    
    // Se for erro de API Key ou conectividade, usar fallback
    if (error.message.includes('API Key') || 
        error.message.includes('403') || 
        error.message.includes('401') ||
        error.message.includes('Network') ||
        error.message.includes('fetch')) {
      
      console.log('🔄 Usando resultado fallback devido a problema de API...');
      return generateFallbackResult(promptType, collectedData);
    }
    
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao gerar resultado final'
    };
  }
};

// Função fallback para gerar resultado quando a API falha
const generateFallbackResult = (promptType, collectedData) => {
  console.log('🔄 Gerando resultado fallback...');
  
  try {
    if (!collectedData || !Array.isArray(collectedData) || collectedData.length === 0) {
      throw new Error('Nenhuma informação foi coletada para gerar o resultado');
    }

    const collectedInfo = collectedData.map((item, index) => {
      const question = item.question || `Pergunta ${index + 1}`;
      const answer = item.answer || 'Sem resposta';
      return `${index + 1}. **${question}**\n   ${answer}`;
    }).join('\n\n');

    const promptTypeName = promptType?.name || 'Documento Jurídico';
    const date = new Date().toLocaleDateString('pt-BR');

    const fallbackResult = `# ${promptTypeName}

## 📋 Informações Coletadas

${collectedInfo}

---

## 📝 Resultado Baseado nas Informações Fornecidas

Com base nas informações coletadas acima, aqui está um esboço estruturado para seu ${promptTypeName.toLowerCase()}:

### Dados Principais:
${collectedData.map((item, index) => `• ${item.answer || 'Não informado'}`).join('\n')}

### Recomendações:
• Revise todas as informações fornecidas
• Consulte a legislação específica aplicável
• Considere jurisprudência relevante
• Adapte o conteúdo conforme necessário

---

### ⚠️ Observação Importante:
Este resultado foi gerado automaticamente em **modo offline** com base apenas nas informações fornecidas. Para um resultado mais detalhado e personalizado:

1. **Configure a API da OpenAI** seguindo as instruções no arquivo \`OPENAI_API_SETUP.md\`
2. **Obtenha uma chave API** em: https://platform.openai.com/api-keys
3. **Adicione no arquivo .env**: \`VITE_OPENAI_API_KEY=sua_chave_aqui\`
4. **Reinicie o servidor** e tente novamente

---
*Resultado gerado pelo DireitoHub em ${date} - Modo Offline*`;

    console.log('✅ Resultado fallback gerado com sucesso');
    return {
      success: true,
      message: fallbackResult,
      isFallback: true
    };
  } catch (error) {
    console.error('❌ Erro ao gerar resultado fallback:', error);
    return {
      success: true,
      message: `# Erro ao Gerar Resultado

Ocorreu um erro inesperado ao processar as informações coletadas.

**Erro:** ${error.message}

**Recomendação:** 
- Tente reiniciar a conversa
- Verifique se todas as informações foram fornecidas corretamente
- Configure a API da OpenAI para resultados mais robustos

Para suporte, consulte a documentação do sistema.`,
      isFallback: true,
      isError: true
    };
  }
};

// Função para testar conectividade com a API OpenAI
const testAPIConnection = async () => {
  try {
    console.log('🧪 Testando conectividade com a API OpenAI...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'teste' }],
        max_tokens: 5
      })
    });

    console.log('📊 Status da resposta:', response.status);
    
    if (response.ok) {
      console.log('✅ API OpenAI funcionando normalmente');
      return true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Erro na API OpenAI:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro de conectividade:', error.message);
    return false;
  }
};
