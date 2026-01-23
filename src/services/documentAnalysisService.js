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
      apreensoes: 'Objetos apreendidos e quantidade',
      qualificadoras: 'Circunstâncias qualificadoras',
      circunstanciasJudiciais: 'Circunstâncias judiciais (art. 59 CP)',
      atenuantes: 'Circunstâncias atenuantes (art. 65 CP)',
      agravantes: 'Circunstâncias agravantes (art. 61 CP)',
      concurso: 'Concurso de crimes (material/continuado)',
      tentativa: 'Crime tentado ou consumado'
    },
    sentenca: {
      resultado: 'Resultado da sentença (condenação/absolvição)',
      pena: 'Pena aplicada (anos/meses/dias)',
      regime: 'Regime inicial de cumprimento',
      data: 'Data da sentença',
      fundamentacao: 'Fundamentação da dosimetria',
      causasDeAumento: 'Causas de aumento de pena',
      causasDeDiminuicao: 'Causas de diminuição de pena'
    },
    defesa: {
      fundamentosPrincipais: 'Pontos principais de contestação',
      provasAFavor: 'Provas que favorecem o acusado',
      circunstanciasPositivas: 'Circunstâncias positivas não reconhecidas',
      tesesDefensivas: 'Teses defensivas apresentadas'
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
      'crime', 'delito', 'tráfico', 'artigo', 'código penal', 'cp', 'lei',
      'apreendido', 'apreensão', 'drogas', 'arma', 'munição',
      'qualificadora', 'qualificado', 'circunstância', 'agravante', 'atenuante',
      'concurso', 'material', 'continuado', 'tentado', 'consumado'
    ],
    sentenca: [
      'condenado', 'absolvido', 'pena', 'anos', 'meses', 'regime',
      'prisão', 'fechado', 'semiaberto', 'aberto', 'sentença',
      'dosimetria', 'aumento', 'diminuição', 'causa'
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
    .substring(0, 800000); // Aumentado para processar documentos grandes (até ~400k palavras)
};

/**
 * Faz uma requisição HTTP com retry e backoff exponencial
 * @param {string} url - URL da requisição
 * @param {Object} options - Opções da requisição fetch
 * @param {number} maxRetries - Número máximo de tentativas (padrão: 3)
 * @returns {Promise<Response>} Resposta da requisição
 */
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Se a resposta for bem-sucedida (status 2xx), retorna ela
      if (response.ok) {
        return response;
      }

      // Se for erro de rate limit (429), tentar novamente
      if (response.status === 429) {
        lastError = new Error(`Rate limit exceeded (attempt ${attempt + 1}/${maxRetries + 1})`);
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial: 1s, 2s, 4s
          console.log(`⏳ Rate limit atingido, tentando novamente em ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Para outros erros, não tentar novamente
      return response;

    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⚠️ Erro de rede (tentativa ${attempt + 1}/${maxRetries + 1}), tentando novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // Se todas as tentativas falharam, lançar o último erro
  throw lastError;
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
 * Analisa documento especificamente para Apelação Criminal com suporte a documentos grandes
 */
const analyzeApelacaoCriminal = async (documentContent, hasMultipleDocs = false) => {
  const MAX_CHUNK_SIZE = 200000; // ~100k palavras por chunk
  const chunks = [];

  // Dividir documento em chunks se for muito grande
  if (documentContent.length > MAX_CHUNK_SIZE) {
    console.log(`📊 Documento grande detectado (${documentContent.length} chars). Dividindo em chunks...`);

    for (let i = 0; i < documentContent.length; i += MAX_CHUNK_SIZE) {
      chunks.push(documentContent.substring(i, i + MAX_CHUNK_SIZE));
    }

    console.log(`📦 Criados ${chunks.length} chunks para análise`);
  } else {
    chunks.push(documentContent);
  }

  // Analisar cada chunk e combinar resultados
  const allResults = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔍 Analisando chunk ${i + 1}/${chunks.length}...`);

    const chunkResult = await analyzeSingleChunk(chunks[i], hasMultipleDocs, i, chunks.length);

    if (chunkResult) {
      allResults.push(chunkResult);
    }

    // Aguardar entre chunks para evitar rate limits
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Combinar resultados de todos os chunks
  return combineAnalysisResults(allResults);
};

/**
 * Analisa um único chunk do documento
 */
const analyzeSingleChunk = async (chunkContent, hasMultipleDocs, chunkIndex, totalChunks) => {
  const processedContent = chunkContent
    .replace(/\s+/g, ' ')
    .replace(/art\.?\s*(\d+)/gi, 'artigo $1')
    .replace(/cód\.?\s*penal/gi, 'código penal')
    .replace(/cp\.?/gi, 'código penal')
    .replace(/réu/gi, 'acusado')
    .replace(/denunciado/gi, 'acusado')
    .substring(0, 200000);

  const docContext = hasMultipleDocs
    ? `Você está analisando PARTE ${chunkIndex + 1} de ${totalChunks} de MÚLTIPLOS DOCUMENTOS. Foque nas informações encontradas nesta parte específica.`
    : `Você está analisando PARTE ${chunkIndex + 1} de ${totalChunks} do documento. Foque nas informações encontradas nesta parte específica.`;

  const analysisPrompt = `${docContext}

⚠️ INSTRUÇÕES CRÍTICAS - NÃO VIOLAR ⚠️
1. EXTRAIA APENAS informações que apareçam EXPLICITAMENTE no documento
2. SE UMA INFORMAÇÃO NÃO ESTIVER NO DOCUMENTO, DEIXE O CAMPO VAZIO ("")
3. ⛔ NÃO INVENTE, SUPONHA, OU INFERA DADOS NUNCA
4. ⛔ NÃO USE EXEMPLOS OU DADOS PADRÃO
5. COPIE O TEXTO EXATO do documento para cada campo
6. Se o documento não menciona algo, retorne string vazia ""

Analise este documento juridico e extraia informações para apelação criminal.
SÓ COPIE DO DOCUMENTO, NÃO INVENTE:

ACUSADO - COPIAR EXATAMENTE DO DOCUMENTO:
- Nome completo (se não houver, deixar vazio)
- Data de nascimento em formato dd/mm/yyyy (se não houver, deixar vazio)
- CPF ou RG números exatos (se não houver, deixar vazio)
- Endereço completo (se não houver, deixar vazio)

PROCESSO - COPIAR EXATAMENTE DO DOCUMENTO:
- Número do processo (se não houver, deixar vazio)
- Comarca/Tribunal (se não houver, deixar vazio)
- Nome do juiz (se não houver, deixar vazio)

CRIMES - COPIAR EXATAMENTE DO DOCUMENTO:
- Crimes acusados (o que está escrito no documento)
- Números de artigos do Código Penal (o que está escrito)
- Objetos apreendidos com quantidades exatas (conforme documento)
- Circunstâncias qualificadoras (conforme documento, deixar vazio se não houver)
- Circunstâncias judiciais art. 59 CP (conforme documento)
- Circunstâncias atenuantes art. 65 CP (conforme documento)
- Circunstâncias agravantes art. 61 CP (conforme documento)
- Concurso de crimes (conforme documento)
- Tentado ou consumado (conforme documento)

SENTENÇA - COPIAR EXATAMENTE DO DOCUMENTO:
- Resultado (conforme documento)
- Pena exata (conforme documento)
- Regime inicial (conforme documento)
- Data da sentença (conforme documento)
- Fundamentação dosimetria (conforme documento)
- Causas de aumento (conforme documento)
- Causas de diminuição (conforme documento)

DEFESA - COPIAR EXATAMENTE DO DOCUMENTO:
- Argumentos de defesa (conforme documento)
- Provas listadas (conforme documento)
- Circunstâncias positivas (conforme documento)
- Teses defensivas (conforme documento)

TESTEMUNHAS - COPIAR EXATAMENTE DO DOCUMENTO:
- Nome da testemunha (conforme documento)
- O que declarou (exato do documento)
- Se acusação ou defesa (conforme documento)

PERÍCIAS - COPIAR EXATAMENTE DO DOCUMENTO:
- Tipo de perícia
- Resultados
- Conclusões

Documento para análise (PARTE ${chunkIndex + 1}/${totalChunks}):
${processedContent}

RETORNE APENAS JSON COM DADOS REAIS:

{
  "acusado": {
    "nome": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "dataNascimento": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "cpf": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "endereco": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO"
  },
  "processo": {
    "numero": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "comarca": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "juiz": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO"
  },
  "crimes": {
    "acusacoes": ["LISTA DO DOCUMENTO OU []"],
    "artigos": ["LISTA DO DOCUMENTO OU []"],
    "apreensoes": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "qualificadoras": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "circunstanciasJudiciais": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "atenuantes": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "agravantes": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "concurso": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "tentativa": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO"
  },
  "sentenca": {
    "resultado": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "pena": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "regime": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "data": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "fundamentacao": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "causasDeAumento": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "causasDeDiminuicao": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO"
  },
  "defesa": {
    "fundamentosPrincipais": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "provasAFavor": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "circunstanciasPositivas": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO",
    "tesesDefensivas": "COPIAR DO DOCUMENTO OU DEIXAR VAZIO"
  },
  "testemunhas": [
    {
      "nome": "COPIAR DO DOCUMENTO",
      "depoimento": "COPIAR DO DOCUMENTO",
      "tipo": "COPIAR DO DOCUMENTO"
    }
  ],
  "pericias": [
    {
      "tipo": "COPIAR DO DOCUMENTO",
      "resultado": "COPIAR DO DOCUMENTO",
      "conclusao": "COPIAR DO DOCUMENTO"
    }
  ]
}`;

  try {
    console.log(`📝 Enviando chunk ${chunkIndex + 1}/${totalChunks} para análise...`);

    // ====== DEBUG LOGGING - O QUE ESTÁ SENDO ENVIADO ======
    console.log('='.repeat(80));
    console.log(`📋 CONTEÚDO ENVIADO PARA CHATGPT - CHUNK ${chunkIndex + 1}/${totalChunks}`);
    console.log('='.repeat(80));
    console.log({
      caracteres: processedContent.length,
      palavras: processedContent.split(/\s+/).length,
      linhas: processedContent.split('\n').length,
      primeiros500chars: processedContent.substring(0, 500),
      ultimos500chars: processedContent.substring(Math.max(0, processedContent.length - 500))
    });
    console.log('PROMPT PREVIEW (primeiros 300 chars):', analysisPrompt.substring(0, 300));
    console.log('='.repeat(80));

    const response = await fetchWithRetry(AI_CONFIG.API_URL, {
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
            content: `Você é um EXTRATOR DE DADOS de documentos juridicos. REGRAS ABSOLUTAS:

1. ⛔ NÃO INVENTE DADOS NUNCA
2. ⛔ NÃO USE EXEMPLOS OU DADOS PADRÃO
3. ⛔ NÃO INFERA OU SUPONHA INFORMAÇÕES
4. ✅ COPIE TEXTO EXATO do documento para cada campo
5. ✅ SE NÃO ENCONTRAR, DEIXE CAMPO VAZIO ("")
6. ✅ RETORNE SEMPRE JSON VÁLIDO

CRÍTICO: Cada valor NO JSON deve vir DIRETAMENTE do documento.
- Nomes: copiar exatamente como aparecem
- Datas: copiar exatamente conforme escrito
- Números: copiar exatamente (artigos, CPF, etc)
- Textos: copiar palavra por palavra do documento
- Listas vazias: usar []
- Strings vazias: usar ""

NUNCA faça o que a instrução anterior menciona (exemplos, padrões, inferências).
Funcione como um SCANNER, não como um CRIADOR de dados.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000
      })
    }, 3);

    if (!response.ok) {
      console.error(`❌ Erro na análise do chunk ${chunkIndex + 1}:`, response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content.trim();

    // ====== DEBUG LOGGING - O QUE CHATGPT RETORNOU ======
    console.log('='.repeat(80));
    console.log(`✅ RESPOSTA RECEBIDA DO CHATGPT - CHUNK ${chunkIndex + 1}/${totalChunks}`);
    console.log('='.repeat(80));
    console.log('RAW RESPONSE (primeiros 500 chars):', analysisText.substring(0, 500));
    console.log('='.repeat(80));

    // Parse JSON da resposta
    let extractedData = {};
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
        console.log(`✅ JSON EXTRAÍDO CHUNK ${chunkIndex + 1}:`, JSON.stringify(extractedData, null, 2));
        console.log(`✅ Chunk ${chunkIndex + 1} analisado com sucesso`);
      }
    } catch (parseError) {
      console.warn(`⚠️ Falha ao fazer parse do JSON no chunk ${chunkIndex + 1}:`, parseError);
      console.warn(`⚠️ Texto que falhou no parse:`, analysisText.substring(0, 300));
      extractedData = {};
    }

    return extractedData;

  } catch (error) {
    console.error(`❌ Erro ao analisar chunk ${chunkIndex + 1}:`, error);
    return null;
  }
};

/**
 * Combina resultados de múltiplas análises de chunks
 */
const combineAnalysisResults = (results) => {
  const combined = {
    acusado: {},
    processo: {},
    crimes: { acusacoes: [], artigos: [] },
    sentenca: {},
    defesa: {},
    testemunhas: [],
    pericias: [],
    missingInfo: []
  };

  results.forEach(result => {
    if (!result) return;

    // Combinar acusado
    if (result.acusado) {
      if (result.acusado.nome && !combined.acusado.nome) combined.acusado.nome = result.acusado.nome;
      if (result.acusado.dataNascimento && !combined.acusado.dataNascimento) combined.acusado.dataNascimento = result.acusado.dataNascimento;
      if (result.acusado.cpf && !combined.acusado.cpf) combined.acusado.cpf = result.acusado.cpf;
      if (result.acusado.endereco && !combined.acusado.endereco) combined.acusado.endereco = result.acusado.endereco;
    }

    // Combinar processo
    if (result.processo) {
      if (result.processo.numero && !combined.processo.numero) combined.processo.numero = result.processo.numero;
      if (result.processo.comarca && !combined.processo.comarca) combined.processo.comarca = result.processo.comarca;
      if (result.processo.juiz && !combined.processo.juiz) combined.processo.juiz = result.processo.juiz;
    }

    // Combinar crimes
    if (result.crimes) {
      if (result.crimes.acusacoes) combined.crimes.acusacoes.push(...result.crimes.acusacoes);
      if (result.crimes.artigos) combined.crimes.artigos.push(...result.crimes.artigos);
      if (result.crimes.apreensoes && !combined.crimes.apreensoes) combined.crimes.apreensoes = result.crimes.apreensoes;
      if (result.crimes.qualificadoras && !combined.crimes.qualificadoras) combined.crimes.qualificadoras = result.crimes.qualificadoras;
      if (result.crimes.circunstanciasJudiciais && !combined.crimes.circunstanciasJudiciais) combined.crimes.circunstanciasJudiciais = result.crimes.circunstanciasJudiciais;
      if (result.crimes.atenuantes && !combined.crimes.atenuantes) combined.crimes.atenuantes = result.crimes.atenuantes;
      if (result.crimes.agravantes && !combined.crimes.agravantes) combined.crimes.agravantes = result.crimes.agravantes;
      if (result.crimes.concurso && !combined.crimes.concurso) combined.crimes.concurso = result.crimes.concurso;
      if (result.crimes.tentativa && !combined.crimes.tentativa) combined.crimes.tentativa = result.crimes.tentativa;
    }

    // Combinar sentença
    if (result.sentenca) {
      if (result.sentenca.resultado && !combined.sentenca.resultado) combined.sentenca.resultado = result.sentenca.resultado;
      if (result.sentenca.pena && !combined.sentenca.pena) combined.sentenca.pena = result.sentenca.pena;
      if (result.sentenca.regime && !combined.sentenca.regime) combined.sentenca.regime = result.sentenca.regime;
      if (result.sentenca.data && !combined.sentenca.data) combined.sentenca.data = result.sentenca.data;
      if (result.sentenca.fundamentacao && !combined.sentenca.fundamentacao) combined.sentenca.fundamentacao = result.sentenca.fundamentacao;
      if (result.sentenca.causasDeAumento && !combined.sentenca.causasDeAumento) combined.sentenca.causasDeAumento = result.sentenca.causasDeAumento;
      if (result.sentenca.causasDeDiminuicao && !combined.sentenca.causasDeDiminuicao) combined.sentenca.causasDeDiminuicao = result.sentenca.causasDeDiminuicao;
    }

    // Combinar defesa
    if (result.defesa) {
      if (result.defesa.fundamentosPrincipais && !combined.defesa.fundamentosPrincipais) combined.defesa.fundamentosPrincipais = result.defesa.fundamentosPrincipais;
      if (result.defesa.provasAFavor && !combined.defesa.provasAFavor) combined.defesa.provasAFavor = result.defesa.provasAFavor;
      if (result.defesa.circunstanciasPositivas && !combined.defesa.circunstanciasPositivas) combined.defesa.circunstanciasPositivas = result.defesa.circunstanciasPositivas;
      if (result.defesa.tesesDefensivas && !combined.defesa.tesesDefensivas) combined.defesa.tesesDefensivas = result.defesa.tesesDefensivas;
    }

    // Combinar testemunhas e perícias
    if (result.testemunhas) combined.testemunhas.push(...result.testemunhas);
    if (result.pericias) combined.pericias.push(...result.pericias);
  });

  // Remover duplicatas
  combined.crimes.acusacoes = [...new Set(combined.crimes.acusacoes)];
  combined.crimes.artigos = [...new Set(combined.crimes.artigos)];
  combined.testemunhas = combined.testemunhas.filter((t, index, self) =>
    index === self.findIndex(other => other.nome === t.nome)
  );
  combined.pericias = combined.pericias.filter((p, index, self) =>
    index === self.findIndex(other => other.tipo === p.tipo)
  );

  // Identificar informações faltantes (usar tipo padrão: apelacao-criminal)
  combined.missingInfo = identifyMissingInfo(combined, 'apelacao-criminal');

  console.log('✅ Análise combinada concluída:', {
    testemunhas: combined.testemunhas.length,
    pericias: combined.pericias.length,
    crimes: combined.crimes.acusacoes.length
  });

  return combined;
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
  
  // Se missingInfo não for um array, inicializar como array vazio
  const missing = Array.isArray(missingInfo) ? missingInfo : [];
  
  const criticalFields = [
    'acusado.nome',
    'processo.numero',
    'crimes.acusacoes',
    'sentenca.resultado'
  ];

  const missingCritical = missing.filter(info => 
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

/**
 * Combina o prompt base com as informações extraídas dos documentos
 */
export const injectDocumentInfoIntoPrompt = (basePrompt, extractedInfo) => {
  if (!extractedInfo || Object.keys(extractedInfo).length === 0) {
    return basePrompt;
  }

  // Criar seção de informações dos documentos
  let documentInfoSection = '\n\n---\n\n**INFORMAÇÕES EXTRAÍDAS DOS DOCUMENTOS ANEXADOS:**\n\n';

  if (extractedInfo.acusado) {
    documentInfoSection += '**ACUSADO:**\n';
    if (extractedInfo.acusado.nome) documentInfoSection += `- Nome: ${extractedInfo.acusado.nome}\n`;
    if (extractedInfo.acusado.dataNascimento) documentInfoSection += `- Data de nascimento: ${extractedInfo.acusado.dataNascimento}\n`;
    if (extractedInfo.acusado.cpf) documentInfoSection += `- CPF/RG: ${extractedInfo.acusado.cpf}\n`;
    if (extractedInfo.acusado.endereco) documentInfoSection += `- Endereço: ${extractedInfo.acusado.endereco}\n`;
    documentInfoSection += '\n';
  }

  if (extractedInfo.processo) {
    documentInfoSection += '**PROCESSO:**\n';
    if (extractedInfo.processo.numero) documentInfoSection += `- Número: ${extractedInfo.processo.numero}\n`;
    if (extractedInfo.processo.comarca) documentInfoSection += `- Comarca: ${extractedInfo.processo.comarca}\n`;
    if (extractedInfo.processo.vara) documentInfoSection += `- Vara/Tribunal: ${extractedInfo.processo.vara}\n`;
    documentInfoSection += '\n';
  }

  if (extractedInfo.crimes) {
    documentInfoSection += '**CRIMES E CIRCUNSTÂNCIAS:**\n';
    if (extractedInfo.crimes.acusacoes && extractedInfo.crimes.acusacoes.length > 0) {
      documentInfoSection += `- Crimes imputados: ${extractedInfo.crimes.acusacoes.join(', ')}\n`;
    }
    if (extractedInfo.crimes.artigos && extractedInfo.crimes.artigos.length > 0) {
      documentInfoSection += `- Artigos do Código Penal: ${extractedInfo.crimes.artigos.join(', ')}\n`;
    }
    if (extractedInfo.crimes.apreensoes) documentInfoSection += `- Apreensões: ${extractedInfo.crimes.apreensoes}\n`;
    if (extractedInfo.crimes.qualificadoras) documentInfoSection += `- Circunstâncias qualificadoras: ${extractedInfo.crimes.qualificadoras}\n`;
    if (extractedInfo.crimes.circunstanciasJudiciais) documentInfoSection += `- Circunstâncias judiciais: ${extractedInfo.crimes.circunstanciasJudiciais}\n`;
    if (extractedInfo.crimes.atenuantes) documentInfoSection += `- Circunstâncias atenuantes: ${extractedInfo.crimes.atenuantes}\n`;
    if (extractedInfo.crimes.agravantes) documentInfoSection += `- Circunstâncias agravantes: ${extractedInfo.crimes.agravantes}\n`;
    if (extractedInfo.crimes.concurso) documentInfoSection += `- Concurso de crimes: ${extractedInfo.crimes.concurso}\n`;
    if (extractedInfo.crimes.tentativa) documentInfoSection += `- Crime tentado/consumado: ${extractedInfo.crimes.tentativa}\n`;
    documentInfoSection += '\n';
  }

  if (extractedInfo.sentenca) {
    documentInfoSection += '**SENTENÇA:**\n';
    if (extractedInfo.sentenca.resultado) documentInfoSection += `- Resultado: ${extractedInfo.sentenca.resultado}\n`;
    if (extractedInfo.sentenca.pena) documentInfoSection += `- Pena aplicada: ${extractedInfo.sentenca.pena}\n`;
    if (extractedInfo.sentenca.regime) documentInfoSection += `- Regime inicial: ${extractedInfo.sentenca.regime}\n`;
    if (extractedInfo.sentenca.data) documentInfoSection += `- Data da sentença: ${extractedInfo.sentenca.data}\n`;
    if (extractedInfo.sentenca.fundamentacao) documentInfoSection += `- Fundamentação da dosimetria: ${extractedInfo.sentenca.fundamentacao}\n`;
    if (extractedInfo.sentenca.causasDeAumento) documentInfoSection += `- Causas de aumento: ${extractedInfo.sentenca.causasDeAumento}\n`;
    if (extractedInfo.sentenca.causasDeDiminuicao) documentInfoSection += `- Causas de diminuição: ${extractedInfo.sentenca.causasDeDiminuicao}\n`;
    documentInfoSection += '\n';
  }

  if (extractedInfo.defesa) {
    documentInfoSection += '**DEFESA:**\n';
    if (extractedInfo.defesa.fundamentosPrincipais) documentInfoSection += `- Fundamentos principais: ${extractedInfo.defesa.fundamentosPrincipais}\n`;
    if (extractedInfo.defesa.provasAFavor) documentInfoSection += `- Provas favoráveis: ${extractedInfo.defesa.provasAFavor}\n`;
    if (extractedInfo.defesa.circunstanciasPositivas) documentInfoSection += `- Circunstâncias positivas: ${extractedInfo.defesa.circunstanciasPositivas}\n`;
    if (extractedInfo.defesa.tesesDefensivas) documentInfoSection += `- Teses defensivas: ${extractedInfo.defesa.tesesDefensivas}\n`;
    documentInfoSection += '\n';
  }

  if (extractedInfo.testemunhas && extractedInfo.testemunhas.length > 0) {
    documentInfoSection += '**TESTEMUNHAS E DEPOIMENTOS:**\n';
    extractedInfo.testemunhas.forEach((testemunha, index) => {
      documentInfoSection += `${index + 1}. ${testemunha.nome} (${testemunha.tipo}): ${testemunha.depoimento}\n`;
    });
    documentInfoSection += '\n';
  }

  if (extractedInfo.pericias && extractedInfo.pericias.length > 0) {
    documentInfoSection += '**PERÍCIAS E LAUDOS:**\n';
    extractedInfo.pericias.forEach((pericia, index) => {
      documentInfoSection += `${index + 1}. ${pericia.tipo}: ${pericia.resultado} - Conclusão: ${pericia.conclusao}\n`;
    });
    documentInfoSection += '\n';
  }

  if (extractedInfo.evidenciasEncontradas && extractedInfo.evidenciasEncontradas.length > 0) {
    documentInfoSection += '**EVIDÊNCIAS/APREENSÕES:**\n';
    documentInfoSection += `- ${extractedInfo.evidenciasEncontradas.join(', ')}\n\n`;
  }

  documentInfoSection += '**IMPORTANTE:** Use APENAS essas informações dos documentos. Não invente fatos, nomes ou detalhes que não estejam listados acima. Sempre que citar algo específico, mencione que está baseado nos documentos anexados.\n\n---\n\n';

  // Inserir a seção de informações dos documentos no prompt base
  // Procurar onde inserir - após as diretrizes principais mas antes da estrutura
  const insertPoint = basePrompt.indexOf('## ESTRUTURA DAS RAZÕES DE APELAÇÃO');
  if (insertPoint !== -1) {
    return basePrompt.substring(0, insertPoint) + documentInfoSection + basePrompt.substring(insertPoint);
  }

  // Fallback: inserir no final
  return basePrompt + documentInfoSection;
};

export default {
  analyzeDocument,
  generateQuestionsForMissingInfo,
  hasEnoughInfoToGenerate,
  REQUIRED_INFORMATION,
  KEYWORDS_MAPPING
};
