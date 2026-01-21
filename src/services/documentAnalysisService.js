// Serviço para análise inteligente de documentos e extração de informações
import { AI_CONFIG } from '../config/aiConfig.js';

// Estrutura de informações esperadas por tipo de prompt
const REQUIRED_INFORMATION = {
  'apelacao-criminal': {
    acusado: {
      nome: 'Nome completo do acusado',
      dataNascimento: 'Data de nascimento',
      cpf: 'CPF/RG',
      endereco: 'Endereço'
    },
    processo: {
      numeroProcesso: 'Número do processo',
      comarca: 'Comarca/Tribunal',
      juiz: 'Juiz responsável'
    },
    crimes: {
      acusacoes: 'Crimes imputados',
      artigos: 'Artigos do Código Penal',
      circunstancias: 'Circunstâncias agravantes/atenuantes'
    },
    sentenca: {
      resultado: 'Resultado da sentença (condenação/absolvição)',
      pena: 'Pena aplicada',
      regime: 'Regime inicial',
      data: 'Data da sentença'
    },
    defesa: {
      fundamentosPrincipais: 'Pontos principais de contestação',
      provasAFavor: 'Provas que favorecem o acusado',
      circunstanciasPositivas: 'Circunstâncias positivas não reconhecidas'
    }
  }
};

// Palavras-chave para detectar informações no texto
const KEYWORDS_MAPPING = {
  'apelacao-criminal': {
    acusado: [
      'acusado', 'réu', 'denunciado', 'investigado', 'indiciado',
      'nome:', 'natural de', 'nascido em', 'cpf', 'rg'
    ],
    processo: [
      'processo', 'número', 'autos', 'comarca', 'tribunal', 'vara judicial',
      'juízo', 'juiz', 'sentença'
    ],
    crimes: [
      'crime', 'delito', 'tráfico', 'homicídio', 'roubo', 'furto',
      'artigo', 'código penal', 'cp', 'lei', 'crime doloso'
    ],
    sentenca: [
      'condenado', 'absolvido', 'pena', 'anos', 'meses', 'regime',
      'prisão', 'fechado', 'semiaberto', 'aberto', 'sentença'
    ],
    provas: [
      'testemunha', 'depoimento', 'prova', 'evidência', 'documento',
      'perícia', 'laudo', 'apreendido'
    ]
  }
};

/**
 * Analisa um documento e extrai informações relevantes
 * @param {string} documentContent - Conteúdo do documento (pode ser múltiplos docs concatenados)
 * @param {string} promptType - Tipo de prompt (ex: 'apelacao-criminal')
 * @returns {Promise<Object>} Análise com informações extraídas e faltantes
 */
export const analyzeDocument = async (documentContent, promptType) => {
  try {
    console.log('🔍 Iniciando análise do documento para:', promptType);
    
    if (!documentContent || documentContent.trim().length === 0) {
      return {
        success: false,
        error: 'Documento vazio',
        extractedInfo: {},
        missingInfo: [],
        confidence: 0
      };
    }

    // Detectar se há múltiplos documentos (marcados com ---)
    const hasMultipleDocs = documentContent.includes('---');
    console.log(`📚 Análise ${hasMultipleDocs ? 'MÚLTIPLA' : 'SIMPLES'} de documento(s)`);

    // Para apelação criminal, fazer análise mais detalhada
    if (promptType === 'apelacao-criminal') {
      return await analyzeApelacaoCriminal(documentContent, hasMultipleDocs);
    }

    // Para outros tipos, retornar análise genérica
    return await analyzeGenericDocument(documentContent, promptType);

  } catch (error) {
    console.error('❌ Erro ao analisar documento:', error);
    return {
      success: false,
      error: error.message,
      extractedInfo: {},
      missingInfo: []
    };
  }
};

/**
 * Analisa documento especificamente para Apelação Criminal
 */
const analyzeApelacaoCriminal = async (documentContent, hasMultipleDocs = false) => {
  const docContext = hasMultipleDocs 
    ? 'Você está recebendo MÚLTIPLOS DOCUMENTOS. Extraia informações de TODOS eles em conjunto.'
    : 'Você está recebendo UM ÚNICO DOCUMENTO.';
  
  const analysisPrompt = `${docContext}
  
Analise o seguinte documento jurídico e extraia APENAS as informações objetivas encontradas. 

Responda em JSON puro, sem explicações adicionais.

DOCUMENTO:
${documentContent.substring(0, 8000)}

Responda EXATAMENTE neste formato JSON (retorne null se não encontrar a informação):
{
  "acusado": {
    "nome": "nome completo ou null",
    "dataNascimento": "dd/mm/yyyy ou null",
    "cpf": "00000000000 ou null",
    "endereco": "endereço ou null"
  },
  "processo": {
    "numero": "número do processo ou null",
    "comarca": "comarca ou null",
    "vara": "vara/tribunal ou null"
  },
  "crimes": {
    "acusacoes": ["lista de crimes" ou null],
    "artigos": ["artigos do CP" ou null]
  },
  "sentenca": {
    "resultado": "condenado/absolvido ou null",
    "pena": "descrição da pena ou null",
    "regime": "fechado/semiaberto/aberto ou null"
  },
  "evidenciasEncontradas": ["tipo de prova encontrado no doc" ou null]
}`;

  try {
    const response = await fetch(AI_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.API_KEY}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.MODEL,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de análise jurídica. Extraia APENAS informações encontradas no documento. Retorne JSON válido.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Erro API: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content.trim();
    
    // Parse JSON da resposta
    let extractedData = {};
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.warn('⚠️ Falha ao fazer parse do JSON:', parseError);
      extractedData = parseJsonFlexible(analysisText);
    }

    // Identificar informações faltantes
    const missingInfo = identifyMissingInfo(extractedData, 'apelacao-criminal');
    const hasAllInfo = missingInfo.length === 0;

    console.log('✅ Análise concluída - Informações faltantes:', missingInfo);

    return {
      success: true,
      extractedInfo: extractedData,
      missingInfo: missingInfo,
      hasAllInfo: hasAllInfo,
      confidence: calculateConfidence(extractedData)
    };

  } catch (error) {
    console.error('❌ Erro na análise via IA:', error);
    // Fallback para análise básica por palavras-chave
    return performKeywordAnalysis(documentContent, 'apelacao-criminal');
  }
};

/**
 * Análise genérica para outros tipos de prompts
 */
const analyzeGenericDocument = async (documentContent, promptType) => {
  console.log('📋 Análise genérica para:', promptType);
  
  return {
    success: true,
    extractedInfo: {
      hasContent: documentContent.length > 0,
      characterCount: documentContent.length,
      paragraphCount: documentContent.split('\n\n').length
    },
    missingInfo: [],
    hasAllInfo: true,
    confidence: 0.8
  };
};

/**
 * Análise por palavras-chave como fallback
 */
const performKeywordAnalysis = (content, promptType) => {
  console.log('🔑 Análise por palavras-chave para:', promptType);
  
  const keywords = KEYWORDS_MAPPING[promptType] || {};
  const found = {};
  const contentLower = content.toLowerCase();

  Object.entries(keywords).forEach(([category, words]) => {
    const foundCount = words.filter(word => contentLower.includes(word)).length;
    found[category] = foundCount > 0;
  });

  const missingInfo = identifyMissingInfo(found, promptType);

  return {
    success: true,
    extractedInfo: found,
    missingInfo: missingInfo,
    hasAllInfo: missingInfo.length === 0,
    confidence: 0.5
  };
};

/**
 * Identifica quais informações estão faltando
 */
const identifyMissingInfo = (extractedData, promptType) => {
  const required = REQUIRED_INFORMATION[promptType];
  if (!required) return [];

  const missing = [];

  // Verificar cada categoria
  Object.entries(required).forEach(([category, fields]) => {
    if (typeof fields === 'object') {
      Object.entries(fields).forEach(([field, description]) => {
        const value = extractedData?.[category]?.[field];
        if (!value || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          missing.push({
            category,
            field,
            description,
            priority: calculateFieldPriority(category, field)
          });
        }
      });
    }
  });

  // Ordenar por prioridade
  return missing.sort((a, b) => b.priority - a.priority);
};

/**
 * Calcula prioridade de um campo (para decidir em qual ordem fazer perguntas)
 */
const calculateFieldPriority = (category, field) => {
  const priorities = {
    'acusado.nome': 100,
    'processo.numero': 95,
    'crimes.acusacoes': 90,
    'sentenca.resultado': 85,
    'defesa.fundamentosPrincipais': 80,
    'acusado.dataNascimento': 50,
    'acusado.cpf': 50,
    'defesa.provasAFavor': 70
  };

  return priorities[`${category}.${field}`] || 50;
};

/**
 * Calcula confiança da análise (0-100)
 */
const calculateConfidence = (extractedData) => {
  let foundCount = 0;
  let totalFields = 0;

  Object.values(extractedData).forEach(category => {
    if (typeof category === 'object') {
      Object.values(category).forEach(value => {
        totalFields++;
        if (value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
          foundCount++;
        }
      });
    }
  });

  return totalFields > 0 ? Math.round((foundCount / totalFields) * 100) : 0;
};

/**
 * Gera um resumo visual do que foi encontrado no documento
 */
export const generateDocumentSummary = (extractedInfo) => {
  if (!extractedInfo || Object.keys(extractedInfo).length === 0) {
    return '';
  }

  let summary = '📊 **INFORMAÇÕES EXTRAÍDAS DO DOCUMENTO:**\n\n';

  // Dados do acusado
  if (extractedInfo.acusado) {
    summary += '👤 **Acusado:**\n';
    if (extractedInfo.acusado.nome) summary += `  • Nome: ${extractedInfo.acusado.nome}\n`;
    if (extractedInfo.acusado.dataNascimento) summary += `  • Nascimento: ${extractedInfo.acusado.dataNascimento}\n`;
    if (extractedInfo.acusado.cpf) summary += `  • CPF/RG: ${extractedInfo.acusado.cpf}\n`;
    summary += '\n';
  }

  // Dados do processo
  if (extractedInfo.processo) {
    summary += '⚖️ **Processo:**\n';
    if (extractedInfo.processo.numero) summary += `  • Número: ${extractedInfo.processo.numero}\n`;
    if (extractedInfo.processo.comarca) summary += `  • Comarca: ${extractedInfo.processo.comarca}\n`;
    if (extractedInfo.processo.vara) summary += `  • Vara: ${extractedInfo.processo.vara}\n`;
    summary += '\n';
  }

  // Crimes
  if (extractedInfo.crimes) {
    summary += '⚠️ **Crimes Imputados:**\n';
    if (extractedInfo.crimes.acusacoes && Array.isArray(extractedInfo.crimes.acusacoes)) {
      extractedInfo.crimes.acusacoes.forEach(crime => {
        summary += `  • ${crime}\n`;
      });
    }
    if (extractedInfo.crimes.artigos && Array.isArray(extractedInfo.crimes.artigos)) {
      summary += `  • Artigos: ${extractedInfo.crimes.artigos.join(', ')}\n`;
    }
    summary += '\n';
  }

  // Sentença
  if (extractedInfo.sentenca) {
    summary += '📝 **Sentença:**\n';
    if (extractedInfo.sentenca.resultado) summary += `  • Resultado: ${extractedInfo.sentenca.resultado}\n`;
    if (extractedInfo.sentenca.pena) summary += `  • Pena: ${extractedInfo.sentenca.pena}\n`;
    if (extractedInfo.sentenca.regime) summary += `  • Regime: ${extractedInfo.sentenca.regime}\n`;
    summary += '\n';
  }

  // Evidências encontradas
  if (extractedInfo.evidenciasEncontradas && Array.isArray(extractedInfo.evidenciasEncontradas)) {
    summary += '🔍 **Evidências Encontradas:**\n';
    extractedInfo.evidenciasEncontradas.forEach(ev => {
      summary += `  • ${ev}\n`;
    });
    summary += '\n';
  }

  return summary;
};

/**
 * Gera mensagem formatada mostrando o que foi extraído e o que falta
 */
export const generateDocumentAnalysisMessage = (analysis, questions) => {
  const summary = generateDocumentSummary(analysis.extractedInfo);
  
  let message = `📋 **Análise do documento concluída!**\n\n${summary}`;
  
  if (questions && questions.length > 0) {
    message += `---\n\n💡 **O que preciso de você:**\n\n`;
    
    if (questions.length === 1) {
      message += `${questions[0].text}${questions[0].suggestion ? `\n\n_Sugestão: ${questions[0].suggestion}_` : ''}`;
    } else {
      // Se tem múltiplas perguntas, mostrar apenas a primeira e oferecer opção
      message += `${questions[0].text}${questions[0].suggestion ? `\n\n_Sugestão: ${questions[0].suggestion}_` : ''}`;
      message += `\n\n_(Você pode responder esta pergunta ou digitar "GERAR" para continuar com as informações que temos)_`;
    }
  } else {
    message += `---\n\n✅ **Ótimo!** Tenho todas as informações necessárias. Digite "GERAR" para elaborar a apelação.`;
  }
  
  return message;
};

/**
 * Valida se há informações suficientes para gerar
 */
export const validateSufficientInfo = (analysis, missingInfo) => {
  if (!analysis) return false;
  
  const criticalFields = [
    'acusado.nome',
    'processo.numero',
    'crimes.acusacoes',
    'sentenca.resultado'
  ];

  const missingCritical = missingInfo.filter(info => 
    criticalFields.includes(`${info.category}.${info.field}`)
  );

  // Se faltam campos críticos, não tem informação suficiente
  if (missingCritical.length > 0) {
    return {
      sufficient: false,
      missing: missingCritical
    };
  }

  return {
    sufficient: true,
    missing: []
  };
};

/**
 * Gera perguntas naturais para as informações faltantes
 */
export const generateQuestionsForMissingInfo = (missingInfo, promptType) => {
  if (missingInfo.length === 0) {
    return [];
  }

  const questions = {
    'apelacao-criminal': {
      'acusado.nome': '📋 Qual é o nome completo do acusado?',
      'acusado.dataNascimento': '📅 Qual é a data de nascimento do acusado?',
      'acusado.cpf': '🆔 Qual é o CPF ou RG do acusado?',
      'acusado.endereco': '🏠 Qual é o endereço atual do acusado?',
      'processo.numero': '⚖️ Qual é o número do processo?',
      'processo.comarca': '🏛️ Qual é a comarca ou tribunal responsável?',
      'crimes.acusacoes': '⚠️ Quais são os crimes imputados ao acusado?',
      'crimes.artigos': '📖 Quais artigos do Código Penal foram citados?',
      'sentenca.resultado': '📝 Qual foi o resultado da sentença (condenado/absolvido)?',
      'sentenca.pena': '🔒 Qual foi a pena aplicada?',
      'sentenca.regime': '🏢 Qual foi o regime inicial da pena?',
      'defesa.fundamentosPrincipais': '🎯 Quais são os principais pontos de contestação da sentença?',
      'defesa.provasAFavor': '🔍 Quais provas favorecem o acusado e foram ignoradas?',
      'defesa.circunstanciasPositivas': '✅ Existem circunstâncias atenuantes não reconhecidas?'
    }
  };

  const prompts = questions[promptType] || questions['apelacao-criminal'];

  // Limitar a apenas 2 perguntas prioritárias para evitar sobrecarga
  const topQuestions = missingInfo
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2);

  return topQuestions.map((info, index) => ({
    id: `question-${index}`,
    text: prompts[`${info.category}.${info.field}`] || `Informação faltante: ${info.description}`,
    field: `${info.category}.${info.field}`,
    priority: info.priority,
    required: info.priority > 80,
    suggestion: generateSuggestionForField(info.category, info.field)
  }));
};

/**
 * Gera sugestão de resposta para um campo específico
 */
const generateSuggestionForField = (category, field) => {
  const suggestions = {
    'defesa.fundamentosPrincipais': 'Ex: Erro na valoração das provas, contradição entre depoimentos, violação de direitos fundamentais...',
    'defesa.provasAFavor': 'Ex: Contradições em depoimentos, ausência de provas diretas, documentos que afastam autoria...',
    'defesa.circunstanciasPositivas': 'Ex: Primariedade, bom comportamento, arrependimento, circunstâncias pessoais favoráveis...',
    'crimes.acusacoes': 'Ex: Tráfico de drogas (art. 33, Lei 11.343/06), homicídio simples (art. 121, CP)...',
    'processo.numero': 'Ex: 5005042-10.2024.8.21.0109',
    'acusado.nome': 'Nome completo do réu conforme documentos processuais'
  };

  return suggestions[`${category}.${field}`] || '';
};

/**
 * Verifica se há informações suficientes para gerar
 */
export const hasEnoughInfoToGenerate = (missingInfo, promptType) => {
  // Para apelação criminal, precisa de informações críticas
  if (promptType === 'apelacao-criminal') {
    const criticalFields = [
      'acusado.nome',
      'processo.numero',
      'crimes.acusacoes',
      'sentenca.resultado'
    ];

    const hasCriticalInfo = !missingInfo.some(info => 
      criticalFields.includes(`${info.category}.${info.field}`)
    );

    return hasCriticalInfo;
  }

  // Para outros tipos, verificar se tem pelo menos 70% de informações
  return missingInfo.length === 0 || missingInfo.length < 3;
};

/**
 * Parse JSON flexível para capturar dados mesmo com formato imperfeito
 */
const parseJsonFlexible = (text) => {
  try {
    // Tentar extrair estrutura básica
    const result = {};
    const patterns = {
      acusado: /acusado[:\s]*(.*?)(?=processo|crimes|$)/is,
      processo: /processo[:\s]*(.*?)(?=crimes|sentenca|$)/is,
      crimes: /crimes[:\s]*(.*?)(?=sentenca|defesa|$)/is,
      sentenca: /sentenca[:\s]*(.*?)(?=defesa|$)/is
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        result[key] = match[1].trim();
      }
    });

    return result;
  } catch (error) {
    return {};
  }
};

export default {
  analyzeDocument,
  generateQuestionsForMissingInfo,
  hasEnoughInfoToGenerate,
  REQUIRED_INFORMATION,
  KEYWORDS_MAPPING
};
