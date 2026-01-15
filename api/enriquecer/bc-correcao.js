/**
 * FASE 4: CORREÇÃO DE VALORES - BANCO CENTRAL
 * POST /api/enriquecer/bc-correcao
 * Busca índices BC via SGS API e calcula valores corrigidos
 */

/**
 * Mapeamento de índices BC com códigos SGS
 */
const INDICES_BC = {
  IPCA: { codigo: 433, nome: 'Índice Nacional de Preços ao Consumidor Amplo' },
  INPC: { codigo: 188, nome: 'Índice Nacional de Preços ao Consumidor' },
  TR: { codigo: 226, nome: 'Taxa Referencial' },
  'IGP-M': { codigo: 190, nome: 'Índice Geral de Preços do Mercado' }
};

/**
 * Busca valor do índice na API do BC (SGS)
 * @param {number} codSGS - Código SGS do índice
 * @param {string} dataInicio - Data no formato YYYY-MM-DD
 * @param {string} dataFim - Data no formato YYYY-MM-DD
 * @returns {Promise<number>} Valor do índice
 */
async function buscarIndiceBC(codSGS, dataInicio, dataFim) {
  console.log(`📊 Buscando índice BC - Código: ${codSGS}, Período: ${dataInicio} a ${dataFim}`);
  
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codSGS}/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}: Erro ao buscar índice BC`);
    }

    const dados = await response.json();
    if (!Array.isArray(dados) || dados.length === 0) {
      throw new Error('Nenhum dado retornado pela API do BC');
    }

    return parseFloat(dados[dados.length - 1].valor);
  } catch (erro) {
    console.error(`❌ Erro ao buscar índice BC (${codSGS}):`, erro.message);
    throw erro;
  }
}

/**
 * Calcula a correção de valor baseado em índice
 * @param {number} valorOriginal - Valor original do processo
 * @param {string} dataAjuizamento - Data de ajuizamento (YYYY-MM-DD)
 * @param {string} indiceBC - Tipo de índice (IPCA, INPC, TR, IGP-M)
 * @returns {Promise<Object>} Cálculo da correção
 */
async function calcularCorrecao(valorOriginal, dataAjuizamento, indiceBC) {
  console.log(`💰 Calculando correção: R$ ${valorOriginal} desde ${dataAjuizamento}`);

  if (!valorOriginal || valorOriginal <= 0) {
    throw new Error('Valor da causa inválido');
  }

  if (!indiceBC || !INDICES_BC[indiceBC]) {
    throw new Error(`Índice BC desconhecido: ${indiceBC}. Opções: ${Object.keys(INDICES_BC).join(', ')}`);
  }

  try {
    const codSGS = INDICES_BC[indiceBC].codigo;
    const dataAtual = new Date().toISOString().split('T')[0];

    // Buscar valores do índice
    const indiceInicial = await buscarIndiceBC(codSGS, dataAjuizamento, dataAjuizamento);
    const indiceFinal = await buscarIndiceBC(codSGS, dataAtual, dataAtual);

    if (!indiceInicial || !indiceFinal) {
      throw new Error('Índices retornados inválidos');
    }

    // Calcular valor corrigido
    const valorCorrigido = valorOriginal * (indiceFinal / indiceInicial);
    const percentualCorrecao = ((valorCorrigido - valorOriginal) / valorOriginal) * 100;

    console.log(`✅ Correção calculada: R$ ${valorOriginal} → R$ ${valorCorrigido.toFixed(2)} (+${percentualCorrecao.toFixed(2)}%)`);

    return {
      valorOriginal,
      valorCorrigido: parseFloat(valorCorrigido.toFixed(2)),
      percentualCorrecao: parseFloat(percentualCorrecao.toFixed(2)),
      indiceUsado: indiceBC,
      indiceInicial: parseFloat(indiceInicial.toFixed(4)),
      indiceFinal: parseFloat(indiceFinal.toFixed(4)),
      dataCalculo: dataAtual,
      dataAjuizamento
    };
  } catch (erro) {
    console.error(`❌ Erro no cálculo de correção:`, erro.message);
    throw erro;
  }
}

/**
 * Handler da serverless function
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido. Use POST.' });
  }

  try {
    const { valorCausa, dataAjuizamento, indiceBC = 'IPCA' } = req.body;

    if (!valorCausa || !dataAjuizamento) {
      return res.status(400).json({
        erro: 'Parâmetros obrigatórios: valorCausa, dataAjuizamento',
        exemplo: { valorCausa: 10000.00, dataAjuizamento: '2020-01-15', indiceBC: 'IPCA' }
      });
    }

    // Calcular correção
    const resultado = await calcularCorrecao(valorCausa, dataAjuizamento, indiceBC);

    console.log('🎉 Requisição processada com sucesso');
    return res.status(200).json({ ...resultado, origem: 'calculo' });

  } catch (erro) {
    console.error('❌ Erro na requisição:', erro.message);
    return res.status(500).json({ erro: erro.message });
  }
}
