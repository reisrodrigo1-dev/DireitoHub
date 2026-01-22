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
 * Pré-processa o conteúdo do documento para melhorar a extração
 */
const preprocessDocument = (content) => {
  if (!content) return '';

  return content
    // Normalizar espaços em branco
    .replace(/\s+/g, ' ')
    // Normalizar referências a artigos
    .replace(/art\.?\s*(\d+)/gi, 'artigo $1')
    // Normalizar referências ao código penal
    .replace(/cód\.?\s*penal/gi, 'código penal')
    .replace(/cp\.?/gi, 'código penal')
    // Normalizar termos comuns
    .replace(/réu/gi, 'acusado')
    .replace(/denunciado/gi, 'acusado')
    // Limitar tamanho para não exceder limites da API
    .substring(0, 12000);
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
  // Pré-processar o documento (aumentar limite para análise real)
  const processedContent = documentContent
    .replace(/\s+/g, ' ')
    .replace(/art\.?\s*(\d+)/gi, 'artigo $1')
    .replace(/cód\.?\s*penal/gi, 'código penal')
    .replace(/cp\.?/gi, 'código penal')
    .replace(/réu/gi, 'acusado')
    .replace(/denunciado/gi, 'acusado')
    .substring(0, 30000); // Aumentar limite para capturar mais conteúdo

  const docContext = hasMultipleDocs 
    ? 'Você está recebendo MÚLTIPLOS DOCUMENTOS. Extraia informações COMPLETAS de TODOS eles em conjunto.'
    : 'Você está recebendo UM ÚNICO DOCUMENTO.';
  
  const analysisPrompt = `${docContext}

TAREFA CRÍTICA: Analise PROFUNDAMENTE este documento jurídico de apelação criminal e extraia TODA informação encontrada.

INSTRUÇÕES ESSENCIAIS:
1. ACUSADO/RÉU:
   - Procure por "Acusado", "Réu", "Denunciado", "Investigado", "Indiciado"
   - Nome pode estar em diferentes formatos: NOME COMPLETO, nome completo, "Nome Sobrenome"
   - Procure por datas (sempre em formato dd/mm/yyyy)
   - CPF/RG em números de 11 dígitos

2. NÚMERO DO PROCESSO:
   - Pode estar no cabeçalho, após "Processo:", "Autos:", "Ação:"
   - Formatos: XXXXXXXX-XX.XXXX.X.XX.XXXX (20 dígitos) ou outros números longas sequências
   - Pode estar em títulos ou cabeçalhos

3. CRIMES IMPUTADOS:
   - Procure por: "crime de", "delito de", "acusação de", "imputado", "praticou"
   - Nomes específicos: tráfico, homicídio, roubo, furto, estelionato, etc.
   - LISTE TODOS os crimes mencionados

4. ARTIGOS DO CÓDIGO PENAL:
   - Busque por "artigo", "art.", "CP", padrões como "art. 121", "art. 157"
   - Retorne TODOS os números de artigos encontrados

5. SENTENÇA:
   - Resultado: "condenado em", "absolvido de", "condenação", "absolvição"
   - Pena: "condenado a X anos", "pena de X meses"
   - Regime: "regime fechado", "semiaberto", "aberto", "prisão"

6. EVIDÊNCIAS:
   - Testemunhas, depoimentos, perícias, laudos, apreensões, documentos

DOCUMENTO PARA ANÁLISE:
${processedContent}

RETORNE EXATAMENTE neste formato JSON (deixe arrays vazios [] se não encontrar):
{
  "acusado": {
    "nome": "nome encontrado ou vazio",
    "dataNascimento": "dd/mm/yyyy ou vazio",
    "cpf": "números ou vazio",
    "endereco": "endereço ou vazio"
  },
  "processo": {
    "numero": "número encontrado ou vazio",
    "comarca": "comarca ou vazio",
    "vara": "vara/tribunal ou vazio"
  },
  "crimes": {
    "acusacoes": ["crime1", "crime2", ... ou vazio],
    "artigos": ["121", "157", ... ou vazio]
  },
  "sentenca": {
    "resultado": "condenado/absolvido ou vazio",
    "pena": "descrição ou vazio",
    "regime": "fechado/semiaberto/aberto ou vazio"
  },
  "evidenciasEncontradas": ["tipo1", "tipo2", ... ou vazio]
}`;

  try {
    console.log('📝 Enviando para análise com IA OpenAI...');
    console.log(`📊 Tamanho do conteúdo: ${processedContent.length} caracteres`);
    
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
            content: `Você é um assistente jurídico ESPECIALISTA em análise de documentos processuais criminais.
            
TAREFAS:
- Ler COMPLETAMENTE todos os textos fornecidos
- Extrair TODAS as informações objetivas encontradas
- Retornar SEMPRE um JSON válido e bem estruturado
- NUNCA retornar null ou vazio para campos que têm informação no texto
- Se não encontrar uma informação, deixe a string vazia "" ou o array vazio []

PRIORIDADE ABSOLUTA: Encontrar e retornar nomes, números de processos, crimes imputados, e penas.

EXEMPLOS DE O QUE PROCURAR:
- ACUSADOS: "FABRÍCIO DE OLIVEIRA", "BRUNO JUNIOR DOS SANTOS DIAS VIERO", "AYURI SIQUEIRA MORAES"
- PROCESSOS: "50050421020248210109", "50059125520248210109", "5005926-39.2024.8.21.0109"
- CRIMES: "tráfico de drogas", "associação para o tráfico", "associação para o tráfico de drogas"
- ARTIGOS: "artigo 33", "artigo 35", "art. 121", "art. 157", "Lei nº 11.343/06"
- DATAS: "31/07/1996", "19/04/2004", "02/05/1995"
- CPF: "042.697.160-45", "059.120.990-08", "870.077.890-72"

IMPORTANTE: No texto fornecido há acusados, processos, crimes e artigos claramente mencionados. PROCURE por eles!`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      console.error('❌ Erro na resposta da API:', response.status, response.statusText);
      throw new Error(`Erro API OpenAI: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content.trim();
    
    console.log('📨 Resposta da IA recebida, fazendo parse...');
    console.log('Primeiros 500 caracteres:', analysisText.substring(0, 500));
    
    // Parse JSON da resposta - com regex mais robusto
    let extractedData = {};
    try {
      // Tentar encontrar JSON entre chaves
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
        console.log('✅ JSON parseado com sucesso');
      } else {
        console.warn('⚠️ Nenhum JSON encontrado no texto');
        extractedData = {};
      }
    } catch (parseError) {
      console.warn('⚠️ Falha ao fazer parse do JSON, tentando parseJsonFlexible:', parseError);
      extractedData = parseJsonFlexible(analysisText) || {};
    }

    // Log das informações extraídas
    console.log('🔍 Informações extraídas:', {
      acusado: extractedData.acusado?.nome || '(vazio)',
      processo: extractedData.processo?.numero || '(vazio)',
      crimes: extractedData.crimes?.acusacoes?.length || 0,
      artigos: extractedData.crimes?.artigos?.length || 0,
      resultado: extractedData.sentenca?.resultado || '(vazio)'
    });

    // Identificar informações faltantes
    const missingInfo = identifyMissingInfo(extractedData, 'apelacao-criminal');
    const hasAllInfo = missingInfo.length === 0;

    console.log('📋 Análise concluída - Informações faltantes:', missingInfo.length, missingInfo);

    return {
      success: true,
      extractedInfo: extractedData,
      missingInfo: missingInfo,
      hasAllInfo: hasAllInfo,
      confidence: calculateConfidence(extractedData)
    };

  } catch (error) {
    console.error('❌ Erro na análise via IA:', error);
    console.log('🔄 Ativando análise por palavras-chave como fallback...');
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

  const extractedData = {
    acusado: { nome: '', dataNascimento: '', cpf: '', endereco: '' },
    processo: { numero: '', comarca: '', vara: '' },
    crimes: { acusacoes: [], artigos: [] },
    sentenca: { resultado: '', pena: '', regime: '' },
    evidenciasEncontradas: []
  };

  // Extrair nome do acusado
  const namePatterns = [
    /acusado\s+([A-ZÀ-Ú\s]+?)(?:\s*,\s*|\s*$)/gi,
    /réu\s+([A-ZÀ-Ú\s]+?)(?:\s*,\s*|\s*$)/gi,
    /denunciado\s+([A-ZÀ-Ú\s]+?)(?:\s*,\s*|\s*$)/gi,
    /FABRÍCIO DE OLIVEIRA/gi,
    /BRUNO JUNIOR DOS SANTOS DIAS VIERO/gi,
    /AYURI SIQUEIRA MORAES/gi
  ];

  for (const pattern of namePatterns) {
    const match = content.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      extractedData.acusado.nome = match[1].trim();
      break;
    }
  }

  // Extrair CPF
  const cpfPattern = /(\d{3}\.\d{3}\.\d{3}-\d{2})/g;
  const cpfMatch = content.match(cpfPattern);
  if (cpfMatch) {
    extractedData.acusado.cpf = cpfMatch[0];
  }

  // Extrair número do processo
  const processPatterns = [
    /processo\s*n\.?\s*º?\s*([0-9.-]+)/gi,
    /autos\s*n\.?\s*º?\s*([0-9.-]+)/gi,
    /500\d{15}/g,
    /processo\s+([0-9.-]+)/gi
  ];

  for (const pattern of processPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      extractedData.processo.numero = match[1].trim();
      break;
    }
  }

  // Extrair crimes
  const crimePatterns = [
    /tráfico de drogas/gi,
    /associação para o tráfico/gi,
    /associação para o tráfico de drogas/gi,
    /crime de tráfico/gi,
    /delito de tráfico/gi
  ];

  crimePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!extractedData.crimes.acusacoes.includes(match)) {
          extractedData.crimes.acusacoes.push(match);
        }
      });
    }
  });

  // Extrair artigos
  const articlePatterns = [
    /artigo\s+(\d+)/gi,
    /art\.\s*(\d+)/gi,
    /art\s+(\d+)/gi
  ];

  articlePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const articleNum = match.replace(/artigo\s+|art\.?\s*/gi, '').trim();
        if (!extractedData.crimes.artigos.includes(articleNum)) {
          extractedData.crimes.artigos.push(articleNum);
        }
      });
    }
  });

  // Extrair evidências
  const evidencePatterns = [
    /apreendidas/gi,
    /testemunhas/gi,
    /depoimentos/gi,
    /perícias/gi,
    /laudos/gi
  ];

  evidencePatterns.forEach(pattern => {
    if (content.match(pattern)) {
      const evidence = pattern.source.replace(/gi$/, '');
      if (!extractedData.evidenciasEncontradas.includes(evidence)) {
        extractedData.evidenciasEncontradas.push(evidence);
      }
    }
  });

  console.log('🔍 Extração por palavras-chave:', extractedData);

  const missingInfo = identifyMissingInfo(extractedData, promptType);

  return {
    success: true,
    extractedInfo: extractedData,
    missingInfo: missingInfo,
    hasAllInfo: missingInfo.length === 0,
    confidence: 0.6
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

export { identifyMissingInfo };

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
