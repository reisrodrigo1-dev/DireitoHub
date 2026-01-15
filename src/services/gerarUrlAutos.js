/**
 * FASE 3: GERAÇÃO DE URLs DE AUTOS
 * Mapeia tribunais para seus sistemas de autos e gera URLs diretas
 */

const TRIBUNAL_SISTEMAS = {
  TJSP: { nome: 'Tribunal de Justiça de São Paulo', sistema: 'ESAJ', url: 'https://esaj.tjsp.jus.br/pastadigital' },
  TJRJ: { nome: 'Tribunal de Justiça do Rio de Janeiro', sistema: 'ESAJ', url: 'https://esaj.tjrj.jus.br/pastadigital' },
  TJMG: { nome: 'Tribunal de Justiça de Minas Gerais', sistema: 'TJMG', url: 'https://www4.tjmg.jus.br/juridico/sf/proc_numero.jsp' },
  TRF1: { nome: 'Tribunal Regional Federal da 1ª Região', sistema: 'eProc', url: 'https://eproc.jfrj.jus.br/eprocV2/' },
  TRF2: { nome: 'Tribunal Regional Federal da 2ª Região', sistema: 'eProc', url: 'https://eproc.jfrj.jus.br/eprocV2/' },
  TRF3: { nome: 'Tribunal Regional Federal da 3ª Região', sistema: 'eProc', url: 'https://eproc.jfsp.jus.br/eprocV2/' },
  TRF4: { nome: 'Tribunal Regional Federal da 4ª Região', sistema: 'eProc', url: 'https://eproc.jfrs.jus.br/eprocV2/' },
  TRF5: { nome: 'Tribunal Regional Federal da 5ª Região', sistema: 'eProc', url: 'https://eproc.jfpe.jus.br/eprocV2/' },
  TST: { nome: 'Tribunal Superior do Trabalho', sistema: 'PJe', url: 'https://pje.tst.jus.br/consultarprocessual/' },
  STJ: { nome: 'Superior Tribunal de Justiça', sistema: 'STJ', url: 'https://www.stj.jus.br/portal/site/painel/' },
  STF: { nome: 'Supremo Tribunal Federal', sistema: 'STF', url: 'https://portal.stf.jus.br/processos/' }
};

/**
 * Normaliza número do processo
 * @param {string} numeroProcesso - Número com ou sem formatação
 * @returns {string} Número processado
 */
function normalizarNumeroProcesso(numeroProcesso) {
  if (!numeroProcesso || typeof numeroProcesso !== 'string') return null;
  const processado = numeroProcesso.replace(/\D/g, '');
  return processado.length >= 20 ? processado : null;
}

/**
 * Formata número para padrão CNJ
 * @param {string} numeroProcesso - Número normalizado
 * @returns {string} Número formatado
 */
function formatarParaCNJ(numeroProcesso) {
  if (!numeroProcesso || numeroProcesso.length < 20) return numeroProcesso;
  const num = numeroProcesso.substring(0, 20);
  return `${num.substring(0, 7)}-${num.substring(7, 9)}.${num.substring(9, 13)}.${num.substring(13, 15)}.${num.substring(15, 18)}.${num.substring(18, 20)}`;
}

/**
 * Extrai código do tribunal do número
 * @param {string} numeroProcesso - Número normalizado
 * @returns {string|null} Sigla do tribunal
 */
function extrairTribunal(numeroProcesso) {
  if (!numeroProcesso || numeroProcesso.length < 20) return null;
  const ss = numeroProcesso.substring(13, 15);
  const tribunalMap = {
    '01': 'STF', '02': 'STJ', '03': 'TST',
    '06': 'TRF1', '07': 'TRF2', '08': 'TRF3', '09': 'TRF4', '10': 'TRF5',
    '26': 'TJSP', '27': 'TJRJ', '31': 'TJMG'
  };
  return tribunalMap[ss] || null;
}

/**
 * Gera URL de autos para um tribunal específico
 * @param {string} numeroProcesso - Número do processo
 * @param {string} tribunal - Sigla do tribunal (TJSP, TJRJ, etc.)
 * @returns {Object} {url, tribunal, sistema, disponivel, numeroFormatado}
 */
export function gerarUrlAutos(numeroProcesso, tribunal) {
  console.log('🔗 Gerando URL de autos:', { numeroProcesso, tribunal });
  
  try {
    const numeroNormalizado = normalizarNumeroProcesso(numeroProcesso);
    
    if (!numeroNormalizado) {
      console.warn('⚠️ Número do processo inválido:', numeroProcesso);
      return {
        url: null,
        tribunal: tribunal || 'DESCONHECIDO',
        sistema: null,
        disponivel: false,
        erro: 'Número do processo inválido',
        numeroFormatado: null
      };
    }

    let tribunalUsado = tribunal || extrairTribunal(numeroNormalizado);
    if (!tribunalUsado || !TRIBUNAL_SISTEMAS[tribunalUsado]) {
      console.warn('⚠️ Tribunal desconhecido:', tribunalUsado || tribunal);
      return {
        url: 'https://www.cnj.jus.br/',
        tribunal: tribunal || 'GENÉRICO',
        sistema: 'CNJ',
        disponivel: false,
        numeroFormatado: formatarParaCNJ(numeroNormalizado),
        aviso: 'Tribunal desconhecido. Acesso via portal CNJ.'
      };
    }

    const config = TRIBUNAL_SISTEMAS[tribunalUsado];
    const numeroFormatado = formatarParaCNJ(numeroNormalizado);
    let urlFinal = config.sistema === 'ESAJ'
      ? `${config.url}?processo=${numeroFormatado}`
      : `${config.url}?numeroProcesso=${numeroFormatado}`;

    console.log('✅ URL de autos gerada com sucesso');
    return {
      url: urlFinal,
      tribunal: tribunalUsado,
      sistema: config.sistema,
      disponivel: true,
      numeroFormatado,
      nome: config.nome
    };
    
  } catch (erro) {
    console.error('❌ Erro ao gerar URL de autos:', erro);
    return {
      url: null,
      tribunal: tribunal || 'ERRO',
      sistema: null,
      disponivel: false,
      erro: erro.message,
      numeroFormatado: null
    };
  }
}

/**
 * Valida se um tribunal está disponível
 * @param {string} tribunal - Sigla do tribunal
 * @returns {boolean}
 */
export function isTribunalDisponivel(tribunal) {
  return tribunal in TRIBUNAL_SISTEMAS;
}

/**
 * Lista tribunais disponíveis
 * @returns {Array}
 */
export function listarTribunaisDisponiveis() {
  return Object.entries(TRIBUNAL_SISTEMAS).map(([sigla, config]) => ({
    sigla,
    nome: config.nome,
    sistema: config.sistema
  }));
}

export default {
  gerarUrlAutos,
  isTribunalDisponivel,
  listarTribunaisDisponiveis
};
