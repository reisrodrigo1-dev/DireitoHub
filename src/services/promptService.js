// Serviço para gerenciar os tipos de prompts disponíveis
// Função para carregar dinamicamente os prompts dos arquivos
export const loadPromptFiles = async () => {
  try {
    // Lista de arquivos de prompt disponíveis - começando com o primeiro prompt
    const promptFiles = [
      'Corrigir o Português e Deixar mais claro.txt',
      'Projeto de Lei.txt',
      'Apelacao Criminal.txt',
      'Resumo para clientes.txt',
      'Rebater Argumentos.txt',
      'Busca de Jurisprudência.txt'
    ];

    const prompts = promptFiles.map(fileName => {
      const nameWithoutExtension = fileName.replace(/\.(odt|docx|doc|pdf|zip|txt)$/, '');
      return createPromptFromFileName(nameWithoutExtension);
    });

    return prompts;
  } catch (error) {
    console.error('Erro ao carregar arquivos de prompt:', error);
    return promptTypes; // Fallback para lista hardcoded
  }
};

// Função para criar objeto prompt baseado no nome do arquivo
const createPromptFromFileName = (fileName) => {
  // Remover extensão primeiro
  let nameWithoutExtension = fileName.replace(/\.(odt|docx|doc|pdf|zip|txt)$/, '');
  
  // Normalizar acentuações
  const normalized = nameWithoutExtension
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentuações
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Converte caracteres especiais em hífens
    .replace(/-+/g, '-') // Remove hífens múltiplos
    .replace(/^-|-$/g, ''); // Remove hífens nas extremidades
  
  const id = normalized;

  return {
    id: id,
    name: fileName,
    description: getDescriptionForPrompt(fileName),
    icon: getIconForPrompt(fileName),
    category: getCategoryForPrompt(fileName),
    welcomeMessage: getWelcomeMessageForPrompt(fileName)
  };
};

// Função para obter descrição baseada no nome do arquivo
const getDescriptionForPrompt = (fileName) => {
  const descriptions = {
    'Acrescentar Argumentos': 'Adiciona argumentos jurídicos sólidos a petições e manifestações',
    'Agravo de instrumento': 'Elaboração e revisão de agravos de instrumento',
    'Analisar laudos médicos': 'Análise técnica de laudos médicos para processos judiciais',
    'Analisar PEC - Defensoria': 'Análise de PEC específica para Defensoria Pública',
    'Analisar PEC': 'Análise de Propostas de Emenda Constitucional',
    'Apelação (Dir. Privado, exceto trabalhista)': 'Elaboração de apelações cíveis, exceto trabalhista',
    'Apelação Criminal': 'Elaboração de apelações criminais',
    'Apelação trabalhista': 'Elaboração de apelações trabalhistas',
    'Atualizar Valores pelo CC': 'Atualização de valores conforme Código Civil',
    'Busca de Jurisprudência': 'Pesquisa inteligente de jurisprudências relevantes',
    'contestação': 'Elaboração de contestações processuais',
    'Contrarrazões cível-família': 'Elaboração de contrarrazões cíveis e de família',
    'Contrarrazões de Apelação Criminal': 'Elaboração de contrarrazões criminais',
    'Contrarrazões de Recurso Especial': 'Elaboração de contrarrazões de RESP',
    'Contrarrazões de Recurso Extraordinário': 'Elaboração de contrarrazões de RE',
    'Correção do Português e Sugestões para peças': 'Correção gramatical e sugestões para peças jurídicas',
    'Corrigir o Português e Deixar mais claro': 'Correção e clarificação de textos jurídicos',
    'Depoimento da vítima x laudo médico': 'Análise comparativa entre depoimentos e laudos médicos',
    'Despacho Judicial': 'Elaboração e análise de despachos judiciais',
    'Dosimetria da pena': 'Cálculo e análise de dosimetria da pena',
    'Ementa CNJ': 'Elaboração de ementas conforme padrões do CNJ',
    'Ementa': 'Elaboração de ementas jurisprudenciais',
    'Encontrar contradições nos relatos das testemunhas': 'Identificação de contradições em depoimentos',
    'Habeas Corpus': 'Elaboração de habeas corpus',
    'Inicial de Alimentos': 'Elaboração de ação de alimentos',
    'Inserir fundamentos legais - cpc': 'Inserção de fundamentos legais do CPC',
    'Inserir fundamentos legais': 'Inserção de fundamentos legais gerais',
    'Liberdade Provisória': 'Elaboração de pedidos de liberdade provisória',
    'Linguagem Simples': 'Conversão de textos jurídicos para linguagem simples',
    'Localizador de endereço': 'Localização de endereços para citações',
    'Manual de como usar': 'Guia de uso da plataforma',
    'Maximizar o impacto retórico': 'Otimização retórica de peças jurídicas',
    'Memoriais - Ministério Público': 'Elaboração de memoriais para o MP',
    'Memoriais civel-consumidor': 'Elaboração de memoriais cíveis e de consumidor',
    'Memoriais criminais': 'Elaboração de memoriais criminais',
    'Memoriais Previdenciários': 'Elaboração de memoriais previdenciários',
    'Memoriais Trabalhistas': 'Elaboração de memoriais trabalhistas',
    'Perguntas parte contrária ou testemunhas': 'Elaboração de perguntas para audiências',
    'Português mantendo a escrita': 'Correção mantendo estilo de escrita',
    'Preparação de audiência trabalhista - Reclamando': 'Preparação para audiência trabalhista (reclamado)',
    'Preparação de audiência trabalhista - reclamante': 'Preparação para audiência trabalhista (reclamante)',
    'Projeto de Lei': 'Elaboração de projetos de lei',
    'Quesitos': 'Elaboração de quesitos para perícias',
    'Razões de RESE': 'Elaboração de razões de recurso especial',
    'Rebater argumentos': 'Estratégias para rebater argumentos da parte contrária',
    'Relatório Criminal': 'Elaboração de relatórios criminais',
    'Relatório para Contestação ou Réplica': 'Relatórios para contestação ou tréplica',
    'Resume processos de familia para audiências.': 'Resumo de processos de família para audiências',
    'Resumir processos criminais para a Defesa': 'Resumo de processos criminais para defesa',
    'Resumo para assistidos - DPE': 'Resumo para assistidos da Defensoria Pública',
    'Resumo para cliente': 'Resumo de processos para clientes',
    'Réplica': 'Elaboração de tréplicas',
    'Vítima x depoimentoi': 'Análise de depoimentos de vítimas'
  };

  return descriptions[fileName] || `Assistente especializado em ${fileName}`;
};

// Função para obter ícone baseado no nome do arquivo
const getIconForPrompt = (fileName) => {
  if (fileName.includes('Criminal') || fileName.includes('Habeas') || fileName.includes('Liberdade')) return '🔒';
  if (fileName.includes('Trabalhista') || fileName.includes('trabalhista')) return '👷';
  if (fileName.includes('Família') || fileName.includes('família') || fileName.includes('Alimentos')) return '👨‍👩‍👧‍👦';
  if (fileName.includes('Apelação') || fileName.includes('Recurso') || fileName.includes('Agravo') || fileName.includes('Contrarrazões')) return '📄';
  if (fileName.includes('médico') || fileName.includes('laudo') || fileName.includes('Dosimetria')) return '🏥';
  if (fileName.includes('Jurisprudência') || fileName.includes('Busca') || fileName.includes('Pesquisa')) return '🔍';
  if (fileName.includes('Português') || fileName.includes('Correção') || fileName.includes('Linguagem')) return '📝';
  if (fileName.includes('Valor') || fileName.includes('Cálculo') || fileName.includes('Atualizar')) return '💰';
  if (fileName.includes('Ementa') || fileName.includes('CNJ')) return '📋';
  if (fileName.includes('Memoriais') || fileName.includes('Memorial')) return '📄';
  if (fileName.includes('Defensoria') || fileName.includes('DPE')) return '🛡️';
  if (fileName.includes('Ministério Público') || fileName.includes('MP')) return '⚖️';
  if (fileName.includes('Audiência') || fileName.includes('Preparação')) return '🎯';
  if (fileName.includes('Projeto') || fileName.includes('Lei')) return '📜';
  if (fileName.includes('Relatório') || fileName.includes('Resumo')) return '📊';
  if (fileName.includes('Quesitos') || fileName.includes('Perguntas')) return '❓';
  if (fileName.includes('Endereço') || fileName.includes('Localizador')) return '📍';
  if (fileName.includes('Manual') || fileName.includes('Guia')) return '📚';
  return '⚖️';
};

// Função para obter categoria baseada no nome do arquivo
const getCategoryForPrompt = (fileName) => {
  if (fileName.includes('Criminal') || fileName.includes('Habeas') || fileName.includes('Liberdade') || fileName.includes('Dosimetria')) return 'Criminal';
  if (fileName.includes('Trabalhista') || fileName.includes('trabalhista')) return 'Trabalhista';
  if (fileName.includes('Família') || fileName.includes('família') || fileName.includes('Alimentos')) return 'Família';
  if (fileName.includes('Apelação') || fileName.includes('Recurso') || fileName.includes('Agravo') || fileName.includes('Contrarrazões')) return 'Recursos';
  if (fileName.includes('Analisar') || fileName.includes('médico') || fileName.includes('laudo') || fileName.includes('Análise')) return 'Análise';
  if (fileName.includes('Jurisprudência') || fileName.includes('Busca') || fileName.includes('Pesquisa')) return 'Pesquisa';
  if (fileName.includes('Português') || fileName.includes('Correção') || fileName.includes('Linguagem')) return 'Revisão';
  if (fileName.includes('Valor') || fileName.includes('Cálculo') || fileName.includes('Atualizar')) return 'Cálculos';
  if (fileName.includes('Ementa') || fileName.includes('CNJ')) return 'Jurisprudência';
  if (fileName.includes('Memoriais') || fileName.includes('Memorial')) return 'Memoriais';
  if (fileName.includes('Defensoria') || fileName.includes('DPE')) return 'Defensoria';
  if (fileName.includes('Ministério Público') || fileName.includes('MP')) return 'Ministério Público';
  if (fileName.includes('Audiência') || fileName.includes('Preparação')) return 'Audiência';
  if (fileName.includes('Projeto') || fileName.includes('Lei')) return 'Legislação';
  if (fileName.includes('Relatório') || fileName.includes('Resumo')) return 'Relatórios';
  if (fileName.includes('Quesitos') || fileName.includes('Perguntas')) return 'Perícia';
  if (fileName.includes('Endereço') || fileName.includes('Localizador')) return 'Utilitários';
  if (fileName.includes('Manual') || fileName.includes('Guia')) return 'Ajuda';
  if (fileName.includes('Contestação') || fileName.includes('contestação') || fileName.includes('Réplica')) return 'Defesa';
  if (fileName.includes('Previdenciário') || fileName.includes('Previdenciários')) return 'Previdenciário';
  if (fileName.includes('Consumidor') || fileName.includes('Cível') || fileName.includes('cível')) return 'Cível';
  return 'Geral';
};

// Função para obter mensagem de boas-vindas para cada prompt
const getWelcomeMessageForPrompt = (fileName) => {
  const welcomeMessages = {
    'Corrigir o Português e Deixar mais claro': 'Olá! Envie o texto que deseja corrigir. Vou analisar a gramática, concordância, pontuação e clareza, entregando um texto revisado e mais claro. Basta colar ou digitar o seu texto abaixo.',
    'Projeto de Lei': 'Bem-vindo ao assistente de Projetos de Lei! Descreva qual lei você deseja elaborar, indicando: o tema, o objetivo, o público-alvo e qualquer detalhe importante. Vou redigir um projeto de lei completo, estruturado e em conformidade com as normas legislativas.',
    'Resumo para clientes': 'Bem-vindo ao Resumo para Clientes! Compartilhe comigo o documento jurídico que deseja resumir (petição, parecer, recurso, etc.). Vou traduzir tudo para uma linguagem clara e acessível, explicando o que foi feito, a situação atual e os próximos passos. Seu cliente entenderá tudo perfeitamente!',
    'Rebater Argumentos': 'Bem-vindo ao assistente de Rebater Argumentos! Compartilhe comigo os argumentos da parte contrária que você precisa refutar. Vou analisar ponto a ponto e elaborar uma contra-argumentação jurídica robusta, técnica e irrefutável, com fundamentação legal precisa. Indique também o foco/tema específico da refutação.',
    'Busca de Jurisprudência': 'Bem-vindo ao assistente de Busca de Jurisprudência! Descreva o tema jurídico que precisa pesquisar e indique preferência de tribunal. Vou orientá-lo sobre onde buscar nas plataformas oficiais (STF, STJ, TRFs, TJs). Quando encontrar as decisões, compartilhe comigo (copie e cole ou anexe documentos) e vou formatar em 3 resultados com ementa, tribunal, processo e link direto.',
    'Apelacao Criminal': `🔴 **ASSISTENTE DE APELAÇÃO CRIMINAL** 🔴

Bem-vindo ao especialista em Razões de Apelação Criminal

**COMO FUNCIONA:**

Este assistente elabora apelações criminais **rigorosamente técnicas**, analisando a sentença em profundidade e apresentando argumentação robusta em hierarquia de teses.

**O QUE VOCÊ PRECISA FAZER:**

1️⃣ **Envie um PDF** contendo:
   • A sentença condenatória (completa)
   • A denúncia original
   • Os autos do processo (provas documentais relevantes)
   • Depoimentos das testemunhas (se possível)
   • Qualquer outro documento importante para análise

2️⃣ **Responda minhas perguntas** sobre:
   • O acusado e seus dados pessoais
   • Os crimes imputados e suas circunstâncias
   • Os principais pontos de contestação
   • Circunstâncias favoráveis não mencionadas

3️⃣ **Digite "GERAR"** quando tiver enviado todos os documentos e respondido as perguntas

**Comece enviando o PDF da sentença e dos documentos!** 📄`
  };

  return welcomeMessages[fileName] || `Bem-vindo ao assistente "${fileName}"! Como posso ajudá-lo?`;
};

// Lista estática como fallback (mantida para compatibilidade)
export const promptTypes = [
  {
    id: 'corrigir-portugues',
    name: 'Corrigir o Português e Deixar mais claro',
    description: 'Correção e clarificação de textos jurídicos',
    icon: '📝',
    category: 'Revisão'
  }
];

// Função para agrupar prompts por categoria
export const getPromptsByCategory = () => {
  const categories = {};
  promptTypes.forEach(prompt => {
    if (!categories[prompt.category]) {
      categories[prompt.category] = [];
    }
    categories[prompt.category].push(prompt);
  });
  return categories;
};

// Função para buscar prompt por ID
export const getPromptById = (id) => {
  return promptTypes.find(prompt => prompt.id === id);
};

// Função para buscar prompts por categoria
export const getPromptsBySpecificCategory = (category) => {
  return promptTypes.filter(prompt => prompt.category === category);
};

// Categorias disponíveis
export const categories = [
  { id: 'Análise', name: 'Análise', icon: '🔍', color: 'blue' },
  { id: 'Aprimoramento', name: 'Aprimoramento', icon: '⚡', color: 'purple' },
  { id: 'Audiência', name: 'Audiência', icon: '🎤', color: 'green' },
  { id: 'Cálculos', name: 'Cálculos', icon: '💰', color: 'yellow' },
  { id: 'Comunicação', name: 'Comunicação', icon: '💬', color: 'cyan' },
  { id: 'Criminal', name: 'Criminal', icon: '🔒', color: 'red' },
  { id: 'Defesa', name: 'Defesa', icon: '🛡️', color: 'indigo' },
  { id: 'Defensoria', name: 'Defensoria', icon: '🛡️', color: 'teal' },
  { id: 'Documentos', name: 'Documentos', icon: '📄', color: 'gray' },
  { id: 'Família', name: 'Família', icon: '👨‍👩‍👧‍👦', color: 'pink' },
  { id: 'Fundamentação', name: 'Fundamentação', icon: '📚', color: 'orange' },
  { id: 'Judicial', name: 'Judicial', icon: '👨‍⚖️', color: 'slate' },
  { id: 'Legislativo', name: 'Legislativo', icon: '📜', color: 'lime' },
  { id: 'Memoriais', name: 'Memoriais', icon: '📋', color: 'emerald' },
  { id: 'Perícia', name: 'Perícia', icon: '🔬', color: 'violet' },
  { id: 'Pesquisa', name: 'Pesquisa', icon: '🔍', color: 'sky' },
  { id: 'Recursos', name: 'Recursos', icon: '⚖️', color: 'rose' },
  { id: 'Revisão', name: 'Revisão', icon: '✍️', color: 'amber' },
  { id: 'Trabalhista', name: 'Trabalhista', icon: '👷', color: 'stone' }
];

// Função para carregar o conteúdo de um arquivo de prompt específico
export const loadPromptContent = async (promptId) => {
  try {
    console.log('📥 Tentando carregar prompt com ID:', promptId);
    
    // Mapear ID do prompt para nome do arquivo
    const promptFile = getPromptFileName(promptId);
    
    console.log('🔍 Arquivo encontrado:', promptFile);
    
    if (!promptFile) {
      console.error('❌ Prompt não encontrado para ID:', promptId);
      console.log('📋 IDs disponíveis:', Object.keys({
        'corrigir-portugues': 'Corrigir o Português e Deixar mais claro.txt'
      }));
      throw new Error('Prompt não encontrado');
    }

    // Tentar carregar o arquivo da pasta public/prompts
    const response = await fetch(`/prompts/${promptFile}`);
    
    if (!response.ok) {
      throw new Error(`Erro ao carregar arquivo: ${response.status}`);
    }

    const content = await response.text();
    console.log('✅ Prompt carregado com sucesso:', {
      file: promptFile,
      length: content.length
    });
    return content;
  } catch (error) {
    console.error('Erro ao carregar conteúdo do prompt:', error);
    return null;
  }
};

// Função para mapear ID do prompt para nome do arquivo
const getPromptFileName = (promptId) => {
  const fileMapping = {
    'corrigir-o-portugues-e-deixar-mais-claro': 'Corrigir o Português e Deixar mais claro.txt',
    'projeto-de-lei': 'Projeto de Lei.txt',
    'apelacao-criminal': 'Apelacao Criminal.txt',
    'resumo-para-clientes': 'Resumo para clientes.txt',
    'rebater-argumentos': 'Rebater Argumentos.txt',
    'busca-de-jurisprudencia': 'Busca de Jurisprudência.txt'
  };

  return fileMapping[promptId] || null;
};

// Exportar função para obter mensagem de boas-vindas
export const getWelcomeMessage = (promptIdOrName) => {
  // Procurar pela função interna
  const messageFromFunction = getWelcomeMessageForPrompt(promptIdOrName);
  return messageFromFunction;
};
