// Serviço para gerenciar fluxos de trabalho específicos por tipo de prompt
export const WORKFLOW_PROMPTS = {
  'apelacao-criminal': {
    required: true,
    questions: [
      {
        id: 'mainThesis',
        question: 'Qual é a tese principal da apelação?',
        type: 'select',
        options: [
          'Absolvição por insuficiência de provas',
          'Absolvição por negativa de autoria',
          'Desclassificação do tipo penal',
          'Afastamento de qualificadora/majorante',
          'Redução da pena aplicada',
          'Modificação do regime inicial',
          'Concessão de benefícios legais',
          'Outro (especificar)'
        ],
        required: true
      },
      {
        id: 'paragraphSize',
        question: 'Qual o tamanho aproximado desejado para cada parágrafo?',
        type: 'select',
        options: [
          'Curto (3-5 linhas)',
          'Médio (6-8 linhas)',
          'Longo (9+ linhas)'
        ],
        required: true
      },
      {
        id: 'documentLength',
        question: 'Qual a extensão total desejada para a peça?',
        type: 'select',
        options: [
          'Básica (relatório + admissibilidade + mérito resumido)',
          'Completa (todas as seções detalhadas)',
          'Extensiva (aprofundamento máximo em todas as teses)'
        ],
        required: true
      },
      {
        id: 'emphasisPoints',
        question: 'Há alguma questão específica que deve ser enfatizada?',
        type: 'multiselect',
        options: [
          'Provas testemunhais',
          'Laudos periciais',
          'Materialidade do crime',
          'Autoria',
          'Dosimetria da pena',
          'Regime prisional',
          'Princípios constitucionais',
          'Nulidades processuais',
          'Outro (especificar)'
        ],
        required: false
      },
      {
        id: 'targetCourt',
        question: 'Qual o perfil do Tribunal destinatário?',
        type: 'select',
        options: [
          'Tribunal de Justiça (TJ) - Análise factual predominante',
          'Tribunal Regional Federal (TRF) - Ênfase em questões federais',
          'Superior Tribunal de Justiça (STJ) - Análise jurídica aprofundada',
          'Supremo Tribunal Federal (STF) - Questões constitucionais',
          'Tribunal do Júri - Linguagem acessível'
        ],
        required: true
      }
    ],
    completionMessage: 'Obrigado pelas informações! Agora vou elaborar as razões de apelação criminal com base nos parâmetros fornecidos. O processo pode levar alguns minutos devido à complexidade da análise jurídica.'
  }
};

/**
 * Verifica se um prompt requer fluxo de trabalho
 * @param {string} promptType - Tipo do prompt
 * @returns {boolean} Se requer fluxo de trabalho
 */
export const requiresWorkflow = (promptType) => {
  return WORKFLOW_PROMPTS[promptType]?.required || false;
};

/**
 * Obtém as perguntas do fluxo de trabalho para um tipo de prompt
 * @param {string} promptType - Tipo do prompt
 * @returns {Array} Array de perguntas ou null se não requer workflow
 */
export const getWorkflowQuestions = (promptType) => {
  return WORKFLOW_PROMPTS[promptType]?.questions || null;
};

/**
 * Obtém a mensagem de conclusão do workflow
 * @param {string} promptType - Tipo do prompt
 * @returns {string} Mensagem de conclusão
 */
export const getWorkflowCompletionMessage = (promptType) => {
  return WORKFLOW_PROMPTS[promptType]?.completionMessage || 'Informações coletadas. Iniciando geração...';
};

/**
 * Valida se todas as perguntas obrigatórias foram respondidas
 * @param {string} promptType - Tipo do prompt
 * @param {Object} answers - Respostas fornecidas
 * @returns {Object} {valid: boolean, missing: Array}
 */
export const validateWorkflowAnswers = (promptType, answers) => {
  const questions = getWorkflowQuestions(promptType);
  if (!questions) return { valid: true, missing: [] };

  const missing = questions
    .filter(q => q.required)
    .filter(q => !answers[q.id] || answers[q.id].trim() === '')
    .map(q => q.id);

  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Formata as respostas do workflow para incluir no contexto da IA
 * @param {string} promptType - Tipo do prompt
 * @param {Object} answers - Respostas fornecidas
 * @returns {string} Contexto formatado para a IA
 */
export const formatWorkflowContext = (promptType, answers) => {
  const questions = getWorkflowQuestions(promptType);
  if (!questions) return '';

  let context = '\n\n=== PARÂMETROS ESTRATÉGICOS FORNECIDOS PELO USUÁRIO ===\n';

  questions.forEach(question => {
    const answer = answers[question.id];
    if (answer) {
      context += `\n${question.question}\nResposta: ${answer}\n`;
    }
  });

  context += '\n=== FIM DOS PARÂMETROS ===\n\n';
  context += 'INSTRUÇÃO: Use estes parâmetros para personalizar a profundidade, enfoque e extensão da apelação criminal. Adapte o nível de detalhamento conforme solicitado.\n';

  return context;
};