// Serviço para integração com a API Pública do DataJud
// Documentação: https://datajud-wiki.cnj.jus.br/api-publica/
// Integração REAL com a API oficial do CNJ - SEM dados simulados

// Importar funcionalidades de outras fases
import { mapearPolos } from './mapearPolos.js';

// URLs para as serverless functions da Vercel
// Em produção, usa o mesmo domínio (www.direitohub.com.br) com rewrite no vercel.json
// Em desenvolvimento (localhost), acessa a API de produção do direitohub.com.br
const VERCEL_API_BASE = process.env.NODE_ENV === 'production'
  ? '/api/datajud'
  : 'https://www.direitohub.com.br/api/datajud';

// Chave de API (removida do frontend por segurança)
const API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

// Lista de tribunais disponíveis com endpoints corretos
export const TRIBUNAIS = {
  // Tribunais Superiores
  STF: { alias: 'api_publica_stf', nome: 'Supremo Tribunal Federal', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search' },
  STJ: { alias: 'api_publica_stj', nome: 'Superior Tribunal de Justiça', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search' },
  TST: { alias: 'api_publica_tst', nome: 'Tribunal Superior do Trabalho', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tst/_search' },
  TSE: { alias: 'api_publica_tse', nome: 'Tribunal Superior Eleitoral', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tse/_search' },
  STM: { alias: 'api_publica_stm', nome: 'Superior Tribunal Militar', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_stm/_search' },

  // Tribunais Regionais Federais
  TRF1: { alias: 'api_publica_trf1', nome: 'Tribunal Regional Federal da 1ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trf1/_search' },
  TRF2: { alias: 'api_publica_trf2', nome: 'Tribunal Regional Federal da 2ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trf2/_search' },
  TRF3: { alias: 'api_publica_trf3', nome: 'Tribunal Regional Federal da 3ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trf3/_search' },
  TRF4: { alias: 'api_publica_trf4', nome: 'Tribunal Regional Federal da 4ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trf4/_search' },
  TRF5: { alias: 'api_publica_trf5', nome: 'Tribunal Regional Federal da 5ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trf5/_search' },
  TRF6: { alias: 'api_publica_trf6', nome: 'Tribunal Regional Federal da 6ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trf6/_search' },

  // Tribunais de Justiça Estaduais
  TJAC: { alias: 'api_publica_tjac', nome: 'Tribunal de Justiça do Acre', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjac/_search' },
  TJAL: { alias: 'api_publica_tjal', nome: 'Tribunal de Justiça de Alagoas', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjal/_search' },
  TJAM: { alias: 'api_publica_tjam', nome: 'Tribunal de Justiça do Amazonas', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjam/_search' },
  TJAP: { alias: 'api_publica_tjap', nome: 'Tribunal de Justiça do Amapá', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjap/_search' },
  TJBA: { alias: 'api_publica_tjba', nome: 'Tribunal de Justiça da Bahia', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjba/_search' },
  TJCE: { alias: 'api_publica_tjce', nome: 'Tribunal de Justiça do Ceará', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjce/_search' },
  TJDFT: { alias: 'api_publica_tjdft', nome: 'Tribunal de Justiça do Distrito Federal', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search' },
  TJES: { alias: 'api_publica_tjes', nome: 'Tribunal de Justiça do Espírito Santo', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjes/_search' },
  TJGO: { alias: 'api_publica_tjgo', nome: 'Tribunal de Justiça de Goiás', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjgo/_search' },
  TJMA: { alias: 'api_publica_tjma', nome: 'Tribunal de Justiça do Maranhão', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjma/_search' },
  TJMG: { alias: 'api_publica_tjmg', nome: 'Tribunal de Justiça de Minas Gerais', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmg/_search' },
  TJMS: { alias: 'api_publica_tjms', nome: 'Tribunal de Justiça de Mato Grosso do Sul', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjms/_search' },
  TJMT: { alias: 'api_publica_tjmt', nome: 'Tribunal de Justiça de Mato Grosso', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmt/_search' },
  TJPA: { alias: 'api_publica_tjpa', nome: 'Tribunal de Justiça do Pará', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpa/_search' },
  TJPB: { alias: 'api_publica_tjpb', nome: 'Tribunal de Justiça da Paraíba', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpb/_search' },
  TJPE: { alias: 'api_publica_tjpe', nome: 'Tribunal de Justiça de Pernambuco', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpe/_search' },
  TJPI: { alias: 'api_publica_tjpi', nome: 'Tribunal de Justiça do Piauí', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpi/_search' },
  TJPR: { alias: 'api_publica_tjpr', nome: 'Tribunal de Justiça do Paraná', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search' },
  TJRJ: { alias: 'api_publica_tjrj', nome: 'Tribunal de Justiça do Rio de Janeiro', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search' },
  TJRN: { alias: 'api_publica_tjrn', nome: 'Tribunal de Justiça do Rio Grande do Norte', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrn/_search' },
  TJRO: { alias: 'api_publica_tjro', nome: 'Tribunal de Justiça de Rondônia', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjro/_search' },
  TJRR: { alias: 'api_publica_tjrr', nome: 'Tribunal de Justiça de Roraima', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrr/_search' },
  TJRS: { alias: 'api_publica_tjrs', nome: 'Tribunal de Justiça do Rio Grande do Sul', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrs/_search' },
  TJSC: { alias: 'api_publica_tjsc', nome: 'Tribunal de Justiça de Santa Catarina', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsc/_search' },
  TJSE: { alias: 'api_publica_tjse', nome: 'Tribunal de Justiça de Sergipe', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjse/_search' },
  TJSP: { alias: 'api_publica_tjsp', nome: 'Tribunal de Justiça de São Paulo', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search' },
  TJTO: { alias: 'api_publica_tjto', nome: 'Tribunal de Justiça do Tocantins', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjto/_search' },

  // Tribunais Regionais do Trabalho
  TRT1: { alias: 'api_publica_trt1', nome: 'Tribunal Regional do Trabalho da 1ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt1/_search' },
  TRT2: { alias: 'api_publica_trt2', nome: 'Tribunal Regional do Trabalho da 2ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt2/_search' },
  TRT3: { alias: 'api_publica_trt3', nome: 'Tribunal Regional do Trabalho da 3ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt3/_search' },
  TRT4: { alias: 'api_publica_trt4', nome: 'Tribunal Regional do Trabalho da 4ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt4/_search' },
  TRT5: { alias: 'api_publica_trt5', nome: 'Tribunal Regional do Trabalho da 5ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt5/_search' },
  TRT6: { alias: 'api_publica_trt6', nome: 'Tribunal Regional do Trabalho da 6ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt6/_search' },
  TRT7: { alias: 'api_publica_trt7', nome: 'Tribunal Regional do Trabalho da 7ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt7/_search' },
  TRT8: { alias: 'api_publica_trt8', nome: 'Tribunal Regional do Trabalho da 8ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt8/_search' },
  TRT9: { alias: 'api_publica_trt9', nome: 'Tribunal Regional do Trabalho da 9ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt9/_search' },
  TRT10: { alias: 'api_publica_trt10', nome: 'Tribunal Regional do Trabalho da 10ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt10/_search' },
  TRT11: { alias: 'api_publica_trt11', nome: 'Tribunal Regional do Trabalho da 11ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt11/_search' },
  TRT12: { alias: 'api_publica_trt12', nome: 'Tribunal Regional do Trabalho da 12ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt12/_search' },
  TRT13: { alias: 'api_publica_trt13', nome: 'Tribunal Regional do Trabalho da 13ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt13/_search' },
  TRT14: { alias: 'api_publica_trt14', nome: 'Tribunal Regional do Trabalho da 14ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt14/_search' },
  TRT15: { alias: 'api_publica_trt15', nome: 'Tribunal Regional do Trabalho da 15ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt15/_search' },
  TRT16: { alias: 'api_publica_trt16', nome: 'Tribunal Regional do Trabalho da 16ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt16/_search' },
  TRT17: { alias: 'api_publica_trt17', nome: 'Tribunal Regional do Trabalho da 17ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt17/_search' },
  TRT18: { alias: 'api_publica_trt18', nome: 'Tribunal Regional do Trabalho da 18ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt18/_search' },
  TRT19: { alias: 'api_publica_trt19', nome: 'Tribunal Regional do Trabalho da 19ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt19/_search' },
  TRT20: { alias: 'api_publica_trt20', nome: 'Tribunal Regional do Trabalho da 20ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt20/_search' },
  TRT21: { alias: 'api_publica_trt21', nome: 'Tribunal Regional do Trabalho da 21ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt21/_search' },
  TRT22: { alias: 'api_publica_trt22', nome: 'Tribunal Regional do Trabalho da 22ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt22/_search' },
  TRT23: { alias: 'api_publica_trt23', nome: 'Tribunal Regional do Trabalho da 23ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt23/_search' },
  TRT24: { alias: 'api_publica_trt24', nome: 'Tribunal Regional do Trabalho da 24ª Região', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_trt24/_search' },

  // Tribunais Regionais Eleitorais
  TREAC: { alias: 'api_publica_tre-ac', nome: 'Tribunal Regional Eleitoral do Acre', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-ac/_search' },
  TREAL: { alias: 'api_publica_tre-al', nome: 'Tribunal Regional Eleitoral de Alagoas', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-al/_search' },
  TREAM: { alias: 'api_publica_tre-am', nome: 'Tribunal Regional Eleitoral do Amazonas', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-am/_search' },
  TREAP: { alias: 'api_publica_tre-ap', nome: 'Tribunal Regional Eleitoral do Amapá', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-ap/_search' },
  TREBA: { alias: 'api_publica_tre-ba', nome: 'Tribunal Regional Eleitoral da Bahia', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-ba/_search' },
  TRECE: { alias: 'api_publica_tre-ce', nome: 'Tribunal Regional Eleitoral do Ceará', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-ce/_search' },
  TREDF: { alias: 'api_publica_tre-dft', nome: 'Tribunal Regional Eleitoral do Distrito Federal', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-dft/_search' },
  TREES: { alias: 'api_publica_tre-es', nome: 'Tribunal Regional Eleitoral do Espírito Santo', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-es/_search' },
  TREGO: { alias: 'api_publica_tre-go', nome: 'Tribunal Regional Eleitoral de Goiás', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-go/_search' },
  TREMA: { alias: 'api_publica_tre-ma', nome: 'Tribunal Regional Eleitoral do Maranhão', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-ma/_search' },
  TREMG: { alias: 'api_publica_tre-mg', nome: 'Tribunal Regional Eleitoral de Minas Gerais', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-mg/_search' },
  TREMS: { alias: 'api_publica_tre-ms', nome: 'Tribunal Regional Eleitoral do Mato Grosso do Sul', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-ms/_search' },
  TREMT: { alias: 'api_publica_tre-mt', nome: 'Tribunal Regional Eleitoral do Mato Grosso', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-mt/_search' },
  TREPA: { alias: 'api_publica_tre-pa', nome: 'Tribunal Regional Eleitoral do Pará', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-pa/_search' },
  TREPB: { alias: 'api_publica_tre-pb', nome: 'Tribunal Regional Eleitoral da Paraíba', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-pb/_search' },
  TREPE: { alias: 'api_publica_tre-pe', nome: 'Tribunal Regional Eleitoral de Pernambuco', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-pe/_search' },
  TREPI: { alias: 'api_publica_tre-pi', nome: 'Tribunal Regional Eleitoral do Piauí', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-pi/_search' },
  TREPR: { alias: 'api_publica_tre-pr', nome: 'Tribunal Regional Eleitoral do Paraná', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-pr/_search' },
  TRERJ: { alias: 'api_publica_tre-rj', nome: 'Tribunal Regional Eleitoral do Rio de Janeiro', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-rj/_search' },
  TRERN: { alias: 'api_publica_tre-rn', nome: 'Tribunal Regional Eleitoral do Rio Grande do Norte', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-rn/_search' },
  TRERO: { alias: 'api_publica_tre-ro', nome: 'Tribunal Regional Eleitoral de Rondônia', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-ro/_search' },
  TRERR: { alias: 'api_publica_tre-rr', nome: 'Tribunal Regional Eleitoral de Roraima', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-rr/_search' },
  TRERS: { alias: 'api_publica_tre-rs', nome: 'Tribunal Regional Eleitoral do Rio Grande do Sul', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-rs/_search' },
  TRESC: { alias: 'api_publica_tre-sc', nome: 'Tribunal Regional Eleitoral de Santa Catarina', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-sc/_search' },
  TRESE: { alias: 'api_publica_tre-se', nome: 'Tribunal Regional Eleitoral de Sergipe', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-se/_search' },
  TRESP: { alias: 'api_publica_tre-sp', nome: 'Tribunal Regional Eleitoral de São Paulo', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-sp/_search' },
  TRETO: { alias: 'api_publica_tre-to', nome: 'Tribunal Regional Eleitoral do Tocantins', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tre-to/_search' },

  // Justiça Militar
  TJMMG: { alias: 'api_publica_tjmmg', nome: 'Tribunal Justiça Militar de Minas Gerais', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmmg/_search' },
  TJMRS: { alias: 'api_publica_tjmrs', nome: 'Tribunal Justiça Militar do Rio Grande do Sul', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmrs/_search' },
  TJMSP: { alias: 'api_publica_tjmsp', nome: 'Tribunal Justiça Militar de São Paulo', endpoint: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmsp/_search' }
};

// Função para organizar tribunais por categoria
export const obterTribunaisPorCategoria = () => {
  return {
    'Tribunais Superiores': [
      'STF', 'STJ', 'TST', 'TSE', 'STM'
    ],
    'Tribunais Regionais Federais': [
      'TRF1', 'TRF2', 'TRF3', 'TRF4', 'TRF5', 'TRF6'
    ],
    'Tribunais de Justiça': [
      'TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TJPR', 'TJSC', 
      'TJBA', 'TJGO', 'TJDF', 'TJPE', 'TJCE', 'TJMT', 
      'TJMS', 'TJPB', 'TJAL', 'TJSE', 'TJRN', 'TJPI', 
      'TJMA', 'TJPA', 'TJAP', 'TJAM', 'TJRR', 'TJAC', 
      'TJRO', 'TJTO', 'TJES'
    ],
    'Tribunais Regionais do Trabalho': [
      'TRT1', 'TRT2', 'TRT3', 'TRT4', 'TRT5', 'TRT6', 
      'TRT7', 'TRT8', 'TRT9', 'TRT10', 'TRT11', 'TRT12', 
      'TRT13', 'TRT14', 'TRT15', 'TRT16', 'TRT17', 'TRT18', 
      'TRT19', 'TRT20', 'TRT21', 'TRT22', 'TRT23', 'TRT24'
    ],
    'Tribunais Regionais Eleitorais': [
      'TRESP', 'TRERJ', 'TREMG', 'TRERS', 'TREPR', 
      'TRESC', 'TREBA', 'TREGO', 'TREDF'
    ]
  };
};

// Função para fazer requisições REAIS à API DataJud do CNJ via Vercel
const makeRequestReal = async (endpoint, params = {}) => {
  console.log(`🌐 Buscando dados REAIS na API DataJud via Vercel: ${endpoint}`);

  try {
    const url = `${VERCEL_API_BASE}${endpoint}`;

    // Headers para requisição
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'DireitoHub/1.0'
    };

    console.log(`📡 Fazendo requisição POST para: ${url}`);
    console.log('📋 Parâmetros:', params);

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(params)
    });

    console.log(`📊 Status da resposta: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API DataJud retornou ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Dados reais obtidos da API DataJud via Vercel:', data);

    return {
      success: true,
      data: data.data || data,
      source: 'datajud-official',
      timestamp: new Date().toISOString(),
      ...data
    };

  } catch (error) {
    console.error('❌ Erro ao buscar dados reais na API DataJud:', error);
    return {
      success: false,
      error: error.message,
      source: 'datajud-official',
      timestamp: new Date().toISOString()
    };
  }
};

// Função auxiliar para consulta por tribunal específico
const consultarTribunalEspecifico = async (numeroProcesso, tribunalAlias) => {
  try {
    console.log(`🏛️ Consultando tribunal específico: ${tribunalAlias}`);
    
    const endpoint = `/tribunais/${tribunalAlias}/processos`;
    const params = {
      numeroProcesso: numeroProcesso,
      formato: 'json'
    };
    
    return await makeRequestReal(endpoint, params);
    
  } catch (error) {
    console.error(`❌ Erro ao consultar tribunal ${tribunalAlias}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Função para buscar processo por número - DADOS REAIS DO CNJ
export const buscarProcessoPorNumero = async (numeroProcesso, tribunais = []) => {
  try {
    console.log('🔍 Buscando processo REAL por número:', numeroProcesso);

    // Validar número do processo
    const numeroLimpo = numeroProcesso.replace(/[^\d]/g, '');
    if (numeroLimpo.length !== 20) {
      throw new Error('Número do processo deve ter 20 dígitos');
    }

    // Validar dígito verificador
    if (!validarNumeroProcessoCNJ(numeroLimpo)) {
      throw new Error('Número de processo inválido (dígito verificador incorreto)');
    }

    // Identificar tribunal pelo número do processo
    const tribunalInfo = obterInfoTribunal(numeroLimpo);
    console.log('🏛️ Tribunal identificado:', tribunalInfo);

    // Query Elasticsearch para busca por número do processo
    const query = {
      "query": {
        "bool": {
          "must": [
            {
              "term": {
                "numeroProcesso": numeroLimpo
              }
            }
          ]
        }
      },
      "size": 10,
      "_source": [
        "id",
        "numeroProcesso",
        "numeroProcessoFormatado",
        "tribunal",
        "grau",
        "nivelSigilo",
        "dataAjuizamento",
        "dataUltimaAtualizacao",
        "orgaoJulgador",
        "orgaoJulgador.nome",
        "orgaoJulgador.codigo",
        "classe",
        "classe.nome",
        "classe.codigo",
        "assuntos",
        "assuntos.nome",
        "assuntos.codigo",
        "movimentos",
        "movimentos.dataHora",
        "movimentos.complementosTabelados",
        "movimentos.nome",
        "movimentos.codigo",
        "partes",
        "partes.nome",
        "partes.tipoPessoa",
        "partes.polo",
        "representantes",
        "representantes.nome",
        "representantes.tipoPessoa",
        "valorCausa",
        "dataHoraUltimaAtualizacao",
        "numeroUnico"
      ]
    };

    // Estratégia 1: Busca via Vercel serverless function
    try {
      const resultadoVercel = await makeRequestReal('/buscar-numero', {
        numeroProcesso: numeroLimpo,
        tribunais: tribunais
      });

      if (resultadoVercel.success && resultadoVercel.data && resultadoVercel.data.length > 0) {
        console.log('✅ Processo encontrado via Vercel');
        return {
          success: true,
          data: resultadoVercel.data.map(item => converterDadosDataJud(item)),
          source: 'datajud-official',
          tribunal: resultadoVercel.tribunal,
          total: resultadoVercel.total
        };
      }
    } catch (error) {
      console.log('⚠️ Falha na busca via Vercel:', error.message);
    }

    // Se chegou aqui, não encontrou o processo
    return {
      success: false,
      error: 'Processo não encontrado na base de dados do CNJ. Verifique se o número está correto e se o processo está disponível publicamente.',
      source: 'datajud-official',
      numeroProcesso: numeroLimpo,
      tribunalInfo: tribunalInfo
    };

  } catch (error) {
    console.error('❌ Erro ao buscar processo:', error);
    return {
      success: false,
      error: error.message,
      source: 'datajud-official'
    };
  }
};

// Função para mapear código do tribunal para alias da API
function mapearCodigoParaAlias(codigoTribunal) {
  const mapeamento = {
    // Tribunais Superiores
    '1001': 'stf',
    '2001': 'cnj', 
    '3001': 'stj',
    '5001': 'tst',
    '6001': 'tse',
    '7001': 'stm',
    
    // TRFs
    '4001': 'trf1',
    '4002': 'trf2', 
    '4003': 'trf3',
    '4004': 'trf4',
    '4005': 'trf5',
    '4006': 'trf6',
    
    // TJs principais
    '8260': 'tjsp',
    '8190': 'tjrj',
    '8130': 'tjmg', 
    '8210': 'tjrs',
    '8160': 'tjpr',
    '8240': 'tjsc',
    '8050': 'tjba'
  };
  
  return mapeamento[codigoTribunal] || null;
}

// Função para buscar processos por documento (CPF/CNPJ) - DADOS REAIS DO CNJ
export const buscarProcessosPorDocumento = async (documento, tribunais = []) => {
  try {
    console.log('🔍 Buscando processos REAIS por documento:', documento);
    
    // Limpar e validar documento
    const documentoLimpo = documento.replace(/[^\d]/g, '');
    
    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
      throw new Error('Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)');
    }
    
    const tipoDocumento = documentoLimpo.length === 11 ? 'cpf' : 'cnpj';
    
    // Estratégia 1: Busca geral por documento
    try {
      const resultadoGeral = await makeRequestReal('/processos/consulta', {
        documento: documentoLimpo,
        tipoDocumento,
        tribunais: tribunais.length > 0 ? tribunais.join(',') : undefined
      });
      
      if (resultadoGeral.success && resultadoGeral.data) {
        console.log('✅ Processos encontrados na busca geral por documento');
        return {
          success: true,
          data: Array.isArray(resultadoGeral.data) ? resultadoGeral.data : [resultadoGeral.data],
          source: 'datajud-official',
          isSimulated: false
        };
      }
    } catch (error) {
      console.log('⚠️ Falha na busca geral por documento:', error.message);
    }
    
    // Estratégia 2: Busca em endpoints específicos
    const endpoints = [
      '/search/processos',
      '/consulta/processos',
      '/buscar/documento',
      '/public/processos/documento'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const resultado = await makeRequestReal(endpoint, {
          documento: documentoLimpo,
          [tipoDocumento]: documentoLimpo,
          tipo: tipoDocumento,
          tribunais: tribunais.length > 0 ? tribunais.join(',') : undefined
        });
        
        if (resultado.success && resultado.data) {
          console.log(`✅ Processos encontrados em ${endpoint}`);
          return {
            success: true,
            data: Array.isArray(resultado.data) ? resultado.data : [resultado.data],
            source: 'datajud-official',
            isSimulated: false
          };
        }
      } catch (error) {
        console.log(`⚠️ Falha em ${endpoint}:`, error.message);
      }
    }
    
    // Estratégia 3: Busca em tribunais específicos se informado
    if (tribunais.length > 0) {
      for (const tribunal of tribunais) {
        try {
          const resultado = await makeRequestReal(`/tribunais/${tribunal}/processos`, {
            documento: documentoLimpo,
            tipo: tipoDocumento
          });
          
          if (resultado.success && resultado.data) {
            console.log(`✅ Processos encontrados no tribunal ${tribunal}`);
            return {
              success: true,
              data: Array.isArray(resultado.data) ? resultado.data : [resultado.data],
              source: 'datajud-official',
              isSimulated: false
            };
          }
        } catch (error) {
          console.log(`⚠️ Falha no tribunal ${tribunal}:`, error.message);
        }
      }
    }
    
    // Se chegou aqui, não encontrou processos
    return {
      success: false,
      error: 'Nenhum processo encontrado para o documento informado na base de dados do CNJ. Verifique se o documento está correto e se há processos públicos associados.',
      source: 'datajud-official',
      documento: documentoLimpo,
      tipoDocumento: tipoDocumento
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar processos por documento:', error);
    return {
      success: false,
      error: error.message,
      source: 'datajud-official'
    };
  }
};

// Função para buscar processos por nome - DADOS REAIS DO CNJ
export const buscarProcessosPorNome = async (nome, tribunais = []) => {
  try {
    console.log('🔍 Buscando processos REAIS por nome:', nome);

    if (!nome || nome.trim().length < 2) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }

    const nomeFormatado = nome.trim();

    // Estratégia: Busca via Vercel serverless function
    try {
      const resultadoVercel = await makeRequestReal('/buscar-nome', {
        nome: nomeFormatado,
        query: nomeFormatado,
        tribunais: tribunais
      });

      if (resultadoVercel.success) {
        console.log('✅ Processos encontrados via Vercel');
        return {
          success: true,
          data: (resultadoVercel.data || []).map(item => converterDadosDataJud(item)),
          total: resultadoVercel.total || 0,
          tribunaisBuscados: resultadoVercel.tribunaisBuscados || [],
          message: resultadoVercel.message || `Encontrados ${resultadoVercel.total || 0} processos`,
          source: 'datajud-official',
          isSimulated: false
        };
      }
    } catch (error) {
      console.warn('⚠️ Erro na busca via Vercel:', error.message);
    }

    // Fallback: sem resultados
    return {
      success: true,
      data: [],
      message: `Nenhum processo encontrado para "${nome}"`,
      source: 'datajud-official',
      isSimulated: false
    };

  } catch (error) {
    console.error('❌ Erro na busca por nome:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      source: 'datajud-official'
    };
  }
};

// Função para buscar processos por advogado
export const buscarProcessosPorAdvogado = async (nomeAdvogado, tribunais = []) => {
  try {
    console.log('🔍 Buscando processos REAIS por advogado:', nomeAdvogado);

    if (!nomeAdvogado || nomeAdvogado.trim().length < 3) {
      throw new Error('Nome do advogado deve ter pelo menos 3 caracteres');
    }

    const nomeFormatado = nomeAdvogado.trim();

    // Estratégia: Busca via Vercel serverless function
    try {
      const resultadoVercel = await makeRequestReal('/buscar-advogado', {
        nomeAdvogado: nomeFormatado,
        tribunais: tribunais
      });

      if (resultadoVercel.success) {
        console.log('✅ Processos encontrados via Vercel');
        return {
          success: true,
          data: (resultadoVercel.data || []).map(item => converterDadosDataJud(item)),
          total: resultadoVercel.total || 0,
          tribunaisBuscados: resultadoVercel.tribunaisBuscados || [],
          message: resultadoVercel.message || `Encontrados ${resultadoVercel.total || 0} processos`,
          source: 'datajud-official',
          isSimulated: false
        };
      }
    } catch (error) {
      console.warn('⚠️ Erro na busca via Vercel:', error.message);
    }

    // Fallback: sem resultados
    return {
      success: true,
      data: [],
      message: `Nenhum processo encontrado para o advogado "${nomeAdvogado}"`,
      source: 'datajud-official',
      isSimulated: false
    };

  } catch (error) {
    console.error('❌ Erro na busca por advogado:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      source: 'datajud-official'
    };
  }
};

// Função para buscar processos por parte
export const buscarProcessosPorParte = async (nomeParte, tribunais = []) => {
  try {
    console.log('🔍 Buscando processos REAIS por parte:', nomeParte);
    
    if (!nomeParte || nomeParte.trim().length < 3) {
      throw new Error('Nome da parte deve ter pelo menos 3 caracteres');
    }
    
    const nomeFormatado = nomeParte.trim();
    
    // Estratégia: Busca por parte/requerente/requerido
    try {
      const resultadoParte = await makeRequestReal('/processos/consulta/parte', {
        nome: nomeFormatado,
        tribunais: tribunais.length > 0 ? tribunais.join(',') : undefined
      });
      
      if (resultadoParte.success && resultadoParte.data) {
        console.log('✅ Processos encontrados na busca por parte');
        return {
          success: true,
          data: Array.isArray(resultadoParte.data) ? resultadoParte.data : [resultadoParte.data],
          source: 'datajud-official',
          isSimulated: false
        };
      }
    } catch (error) {
      console.warn('⚠️ Erro na busca por parte:', error.message);
    }
    
    // Fallback: sem resultados
    return {
      success: true,
      data: [],
      message: `Nenhum processo encontrado para a parte "${nomeParte}"`,
      source: 'datajud-official',
      isSimulated: false
    };
    
  } catch (error) {
    console.error('❌ Erro na busca por parte:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      source: 'datajud-official'
    };
  }
};

// Função para buscar em todos os tribunais
export const buscarEmTodosTribunais = async (criterio, valor) => {
  try {
    console.log('🔍 Buscando em TODOS os tribunais:', criterio, valor);
    
    // Obter todos os tribunais disponíveis
    const todosTribunais = Object.keys(TRIBUNAIS);
    
    // Escolher função de busca baseada no critério
    let funcaoBusca;
    switch (criterio) {
      case 'numero':
        funcaoBusca = buscarProcessoPorNumero;
        break;
      case 'nome':
        funcaoBusca = buscarProcessosPorNome;
        break;
      case 'advogado':
        funcaoBusca = buscarProcessosPorAdvogado;
        break;
      case 'parte':
        funcaoBusca = buscarProcessosPorParte;
        break;
      case 'texto':
        funcaoBusca = buscarProcessoPorTexto;
        break;
      default:
        funcaoBusca = buscarProcessoPorTexto;
    }
    
    // Executar busca em todos os tribunais
    const resultado = await funcaoBusca(valor, todosTribunais);
    
    return {
      ...resultado,
      searchScope: 'all-tribunals',
      tribunaisConsultados: todosTribunais
    };
    
  } catch (error) {
    console.error('❌ Erro na busca em todos os tribunais:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      source: 'datajud-official'
    };
  }
};

// Função para obter movimentações detalhadas - DADOS REAIS DO CNJ
export const obterMovimentacoesProcesso = async (numeroProcesso) => {
  try {
    console.log('🔍 Buscando movimentações REAIS do processo:', numeroProcesso);
    
    const numeroLimpo = numeroProcesso.replace(/[^\d]/g, '');
    
    if (numeroLimpo.length !== 20) {
      throw new Error('Número do processo deve ter 20 dígitos');
    }
    
    // Estratégia 1: Busca geral de movimentações
    try {
      const resultadoGeral = await makeRequestReal(`/processos/${numeroLimpo}/movimentacoes`, {
        numeroProcesso: numeroLimpo
      });
      
      if (resultadoGeral.success && resultadoGeral.data) {
        console.log('✅ Movimentações encontradas na busca geral');
        return {
          success: true,
          data: resultadoGeral.data,
          source: 'datajud-official',
          isSimulated: false
        };
      }
    } catch (error) {
      console.log('⚠️ Falha na busca geral de movimentações:', error.message);
    }
    
    // Estratégia 2: Busca em endpoints específicos
    const endpoints = [
      `/processos/${numeroLimpo}/movimentos`,
      `/consulta/${numeroLimpo}/movimentacoes`,
      `/public/processos/${numeroLimpo}/movimentos`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const resultado = await makeRequestReal(endpoint, {
          numeroProcesso: numeroLimpo
        });
        
        if (resultado.success && resultado.data) {
          console.log(`✅ Movimentações encontradas em ${endpoint}`);
          return {
            success: true,
            data: resultado.data,
            source: 'datajud-official',
            isSimulated: false
          };
        }
      } catch (error) {
        console.log(`⚠️ Falha em ${endpoint}:`, error.message);
      }
    }
    
    // Se chegou aqui, não encontrou movimentações
    return {
      success: false,
      error: 'Movimentações não encontradas para o processo informado na base de dados do CNJ. O processo pode não existir ou as movimentações podem não estar disponíveis publicamente.',
      source: 'datajud-official',
      numeroProcesso: numeroLimpo
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar movimentações:', error);
    return {
      success: false,
      error: error.message,
      source: 'datajud-official'
    };
  }
};

// Validação rigorosa do número de processo CNJ
export function validarNumeroProcessoCNJ(numeroProcesso) {
  const numeroLimpo = numeroProcesso.replace(/[^\d]/g, '');
  
  if (numeroLimpo.length !== 20) {
    return false;
  }
  
  // Algoritmo de validação CNJ
  const sequencial = numeroLimpo.substring(0, 7);
  const dv = numeroLimpo.substring(7, 9);
  const ano = numeroLimpo.substring(9, 13);
  const segmento = numeroLimpo.substring(13, 14);
  const tribunal = numeroLimpo.substring(14, 18);
  const origem = numeroLimpo.substring(18, 20);
  
  const numeroParaValidacao = sequencial + ano + segmento + tribunal + origem;
  let soma = 0;
  
  for (let i = 0; i < numeroParaValidacao.length; i++) {
    const digito = parseInt(numeroParaValidacao[i]);
    const peso = numeroParaValidacao.length - i + 1;
    soma += digito * peso;
  }
  
  const resto = soma % 97;
  const dvCalculado = 98 - resto;
  const dvCalculadoStr = dvCalculado.toString().padStart(2, '0');
  
  return dv === dvCalculadoStr;
}

// Formatar número de processo no padrão CNJ
export function formatarNumeroProcesso(numeroProcesso) {
  const numeroLimpo = numeroProcesso.replace(/[^\d]/g, '');
  
  if (numeroLimpo.length !== 20) {
    return numeroProcesso;
  }
  
  return `${numeroLimpo.substring(0, 7)}-${numeroLimpo.substring(7, 9)}.${numeroLimpo.substring(9, 13)}.${numeroLimpo.substring(13, 14)}.${numeroLimpo.substring(14, 18)}.${numeroLimpo.substring(18, 20)}`;
}

// Obter informações do tribunal pelo número do processo
export function obterInfoTribunal(numeroProcesso) {
  const numeroLimpo = numeroProcesso.replace(/[^\d]/g, '');
  
  if (numeroLimpo.length !== 20) {
    return null;
  }
  
  const segmento = numeroLimpo.substring(13, 14);
  const tribunal = numeroLimpo.substring(14, 18);
  
  const segmentos = {
    '1': 'Supremo Tribunal Federal',
    '2': 'Conselho Nacional de Justiça',
    '3': 'Superior Tribunal de Justiça',
    '4': 'Justiça Federal',
    '5': 'Justiça do Trabalho',
    '6': 'Justiça Eleitoral',
    '7': 'Justiça Militar da União',
    '8': 'Justiça Estadual'
  };
  
  const tribunaisEspecificos = {
    // Tribunais Superiores
    '1001': 'Supremo Tribunal Federal',
    '2001': 'Conselho Nacional de Justiça',
    '3001': 'Superior Tribunal de Justiça',
    '5001': 'Tribunal Superior do Trabalho',
    '6001': 'Tribunal Superior Eleitoral',
    '7001': 'Superior Tribunal Militar',
    
    // TRFs
    '4001': 'Tribunal Regional Federal da 1ª Região',
    '4002': 'Tribunal Regional Federal da 2ª Região',
    '4003': 'Tribunal Regional Federal da 3ª Região',
    '4004': 'Tribunal Regional Federal da 4ª Região',
    '4005': 'Tribunal Regional Federal da 5ª Região',
    '4006': 'Tribunal Regional Federal da 6ª Região',
    
    // TJs principais
    '8260': 'Tribunal de Justiça de São Paulo',
    '8190': 'Tribunal de Justiça do Rio de Janeiro',
    '8130': 'Tribunal de Justiça de Minas Gerais',
    '8210': 'Tribunal de Justiça do Rio Grande do Sul',
    '8160': 'Tribunal de Justiça do Paraná'
  };
  
  return {
    segmento: segmentos[segmento] || 'Segmento desconhecido',
    codigoSegmento: segmento,
    codigoTribunal: tribunal,
    tribunalNome: tribunaisEspecificos[tribunal] || `Tribunal ${tribunal}`,
    numeroCompleto: numeroLimpo
  };
}

// Função para buscar processo por múltiplos critérios (mantida para compatibilidade)
export const buscarProcessoAvancado = async (criterios, tribunais = []) => {
  try {
    console.log('🔍 Busca avançada com critérios:', criterios);
    
    // Se tiver número de processo, usar busca específica
    if (criterios.numeroProcesso) {
      return await buscarProcessoPorNumero(criterios.numeroProcesso, tribunais);
    }
    
    // Se tiver nome, usar busca por nome
    if (criterios.nome || criterios.nomeParte) {
      const nome = criterios.nome || criterios.nomeParte;
      return await buscarProcessosPorNome(nome, tribunais);
    }
    
    // Se tiver documento, usar busca por documento
    if (criterios.documento || criterios.cpf || criterios.cnpj) {
      const doc = criterios.documento || criterios.cpf || criterios.cnpj;
      return await buscarProcessosPorDocumento(doc, tribunais);
    }

    // Para outros critérios não suportados pela API, retornar erro
    console.log('❌ Critérios de busca não suportados pela API DataJud');
    return {
      success: false,
      error: 'Critérios de busca não suportados. Use número do processo, nome da parte ou documento.',
      isSimulated: false
    };
    
  } catch (error) {
    console.error('❌ Erro na busca avançada:', error);
    return {
      success: false,
      error: error.message,
      isSimulated: false
    };
  }
};

// Função para busca por texto livre (mantida para compatibilidade)
export const buscarProcessoPorTexto = async (texto, tribunais = []) => {
  try {
    console.log('🔍 Busca por texto:', texto);
    
    // Tentar identificar se é um número de processo
    const numeroLimpo = texto.replace(/[^\d]/g, '');
    if (numeroLimpo.length === 20) {
      return await buscarProcessoPorNumero(numeroLimpo, tribunais);
    }
    
    // Se não for número, tentar busca por nome
    return await buscarProcessosPorNome(texto, tribunais);
    
  } catch (error) {
    console.error('❌ Erro na busca por texto:', error);
    return {
      success: false,
      error: error.message,
      isSimulated: false
    };
  }
};

// Função para validar e formatar entrada do usuário
export function processarEntradaUsuario(entrada) {
  const entradaLimpa = entrada.trim();
  
  // Verificar se é número de processo
  const apenasNumeros = entradaLimpa.replace(/[^\d]/g, '');
  if (apenasNumeros.length === 20) {
    return {
      tipo: 'numeroProcesso',
      valor: apenasNumeros,
      valorFormatado: formatarNumeroProcesso(apenasNumeros),
      valido: validarNumeroProcessoCNJ(apenasNumeros)
    };
  }
  
  // Verificar se é CPF (11 dígitos)
  if (apenasNumeros.length === 11) {
    return {
      tipo: 'cpf',
      valor: apenasNumeros,
      valorFormatado: formatarCPF(apenasNumeros),
      valido: true // Adicionar validação de CPF se necessário
    };
  }
  
  // Verificar se é CNPJ (14 dígitos)
  if (apenasNumeros.length === 14) {
    return {
      tipo: 'cnpj',
      valor: apenasNumeros,
      valorFormatado: formatarCNPJ(apenasNumeros),
      valido: true // Adicionar validação de CNPJ se necessário
    };
  }
  
  // Se não for número, considerar como nome
  if (entradaLimpa.length >= 3) {
    return {
      tipo: 'nome',
      valor: entradaLimpa,
      valorFormatado: entradaLimpa,
      valido: true
    };
  }
  
  return {
    tipo: 'invalido',
    valor: entradaLimpa,
    valorFormatado: entradaLimpa,
    valido: false,
    erro: 'Entrada inválida'
  };
}

// Formatadores auxiliares
function formatarCPF(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarCNPJ(cnpj) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Função para formatar datas de forma segura, evitando erros de "Invalid Date"
function formatarDataSegura(data) {
  try {
    if (!data) return null;
    
    // Se já é uma string ISO válida, apenas extrair a data
    if (typeof data === 'string') {
      // Remover caracteres especiais inválidos
      const dataLimpa = data.trim();
      
      // Tentar converter formato compactado YYYYMMDDHHMMSS para ISO
      if (/^\d{14}$/.test(dataLimpa)) {
        const ano = dataLimpa.substring(0, 4);
        const mes = dataLimpa.substring(4, 6);
        const dia = dataLimpa.substring(6, 8);
        const hora = dataLimpa.substring(8, 10);
        const minuto = dataLimpa.substring(10, 12);
        const segundo = dataLimpa.substring(12, 14);
        
        const dataISO = `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}Z`;
        const date = new Date(dataISO);
        
        if (isNaN(date.getTime())) {
          console.warn('⚠️ Data inválida encontrada:', data);
          return null;
        }
        
        return date.toISOString().split('T')[0];
      }
      
      // Tentar formato compactado sem hora YYYYMMDD
      if (/^\d{8}$/.test(dataLimpa)) {
        const ano = dataLimpa.substring(0, 4);
        const mes = dataLimpa.substring(4, 6);
        const dia = dataLimpa.substring(6, 8);
        
        const dataISO = `${ano}-${mes}-${dia}T00:00:00Z`;
        const date = new Date(dataISO);
        
        if (isNaN(date.getTime())) {
          console.warn('⚠️ Data inválida encontrada:', data);
          return null;
        }
        
        return date.toISOString().split('T')[0];
      }
      
      // Verificar se é uma data ISO válida
      const date = new Date(dataLimpa);
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Data inválida encontrada:', data);
        return null;
      }
      
      return date.toISOString().split('T')[0];
    }
    
    // Se é um número (timestamp)
    if (typeof data === 'number') {
      const date = new Date(data);
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Timestamp inválido encontrado:', data);
        return null;
      }
      return date.toISOString().split('T')[0];
    }
    
    // Se é um objeto Date
    if (data instanceof Date) {
      if (isNaN(data.getTime())) {
        console.warn('⚠️ Objeto Date inválido encontrado');
        return null;
      }
      return data.toISOString().split('T')[0];
    }
    
    console.warn('⚠️ Tipo de data não suportado:', typeof data);
    return null;
  } catch (error) {
    console.error('❌ Erro ao formatar data:', error, 'Data original:', data);
    return null;
  }
}
// Função para converter dados da API para o formato do sistema
export const converterDadosDataJud = (dadosDataJud) => {
  console.log('🔄 Convertendo dados do DataJud:', dadosDataJud);
  console.log('📝 Partes no DataJud:', dadosDataJud?.partes);
  console.log('👨‍⚖️ Representantes no DataJud:', dadosDataJud?.representantes);
  console.log('📋 TODAS as chaves do objeto DataJud original:');
  console.table(Object.keys(dadosDataJud || {}));
  
  // Log detalhado de cada chave
  if (dadosDataJud) {
    Object.keys(dadosDataJud).forEach(chave => {
      const valor = dadosDataJud[chave];
      const tipo = Array.isArray(valor) ? `Array[${valor.length}]` : typeof valor;
      console.log(`  ├─ ${chave}: ${tipo}`);
      
      // Se for array com dados, mostrar primeiro item
      if (Array.isArray(valor) && valor.length > 0) {
        console.log(`     └─ Primeiro item:`, valor[0]);
      }
    });
  }

  if (!dadosDataJud) {
    return null;
  }

  const convertedData = {
    // Dados identificadores
    id: dadosDataJud.id || dadosDataJud._id || `datajud_${Date.now()}`,
    numeroProcesso: dadosDataJud.numeroProcesso,
    numeroProcessoFormatado: formatarNumeroProcesso(dadosDataJud.numeroProcesso),

    // Dados do tribunal e jurisdição
    tribunal: dadosDataJud.tribunal,
    grau: dadosDataJud.grau,
    nivelSigilo: dadosDataJud.nivelSigilo,

    // Formato do processo
    formato: dadosDataJud.formato || {},
    formatoCodigo: dadosDataJud.formato?.codigo,
    formatoNome: dadosDataJud.formato?.nome,

    // Sistema processual
    sistema: dadosDataJud.sistema || {},
    sistemaCodigo: dadosDataJud.sistema?.codigo,
    sistemaNome: dadosDataJud.sistema?.nome,

    // Classe processual
    classe: dadosDataJud.classe || {},
    classeCodigo: dadosDataJud.classe?.codigo,
    classeNome: dadosDataJud.classe?.nome,

    // Assuntos do processo
    assuntos: dadosDataJud.assuntos || [],

    // Órgão julgador
    orgaoJulgador: dadosDataJud.orgaoJulgador || {},
    orgaoJulgadorCodigo: dadosDataJud.orgaoJulgador?.codigo,
    orgaoJulgadorNome: dadosDataJud.orgaoJulgador?.nome,
    orgaoJulgadorCodigoMunicipioIBGE: dadosDataJud.orgaoJulgador?.codigoMunicipioIBGE,

    // Movimentos processuais (dados completos)
    movimentos: dadosDataJud.movimentos || [],

    // Datas
    dataAjuizamento: dadosDataJud.dataAjuizamento,
    dataHoraUltimaAtualizacao: dadosDataJud.dataHoraUltimaAtualizacao,
    timestamp: dadosDataJud['@timestamp'],

    // Status determinado automaticamente
    status: mapearStatusProcesso(dadosDataJud.movimentos),

    // FASE 1: Mapear partes em polos (autores, requeridos, advogados)
    polos: (() => {
      console.log('🔍 Inspecionando dadosDataJud.partes:', dadosDataJud.partes);
      console.log('🔍 Tipo de partes:', typeof dadosDataJud.partes);
      console.log('🔍 É array?', Array.isArray(dadosDataJud.partes));
      console.log('🔍 Inspecionando dadosDataJud.representantes:', dadosDataJud.representantes);
      console.log('🔍 Tipo de representantes:', typeof dadosDataJud.representantes);
      console.log('🔍 É array?', Array.isArray(dadosDataJud.representantes));
      
      // Debug: mostrar todas as chaves do objeto
      console.log('🔍 Chaves do dadosDataJud:', Object.keys(dadosDataJud));
      
      return mapearPolos(dadosDataJud.partes || [], dadosDataJud.representantes || []);
    })(),

    // Dados originais preservados para referência completa
    dadosOriginais: dadosDataJud,

    // Metadados do sistema
    isFromDataJud: true,
    isSimulated: false,
    dataImportacao: new Date().toISOString(),

    // CAMPOS EXTRAS - Máximo de informações possível
    // Partes do processo (se disponível)
    partes: dadosDataJud.partes || [],
    representantes: dadosDataJud.representantes || [],
    
    // Valor da causa
    valorCausa: dadosDataJud.valorCausa || null,
    
    // Informações adicionais do processo
    numeroUnico: dadosDataJud.numeroUnico || null,
    numeroOrigem: dadosDataJud.numeroOrigem || null,
    
    // Segurança e sigilo
    sigiloDados: dadosDataJud.sigiloDados || false,
    
    // Informações do órgão julgador expandidas
    orgaoJulgadorCompleto: {
      codigo: dadosDataJud.orgaoJulgador?.codigo,
      nome: dadosDataJud.orgaoJulgador?.nome,
      codigoMunicipio: dadosDataJud.orgaoJulgador?.codigoMunicipio,
      codigoMunicipioIBGE: dadosDataJud.orgaoJulgador?.codigoMunicipioIBGE,
      tribunal: dadosDataJud.tribunal,
      grau: dadosDataJud.grau
    },
    
    // Informações de classe expandidas
    classeCompleta: {
      codigo: dadosDataJud.classe?.codigo,
      nome: dadosDataJud.classe?.nome
    },
    
    // Assuntos expandidos
    assuntosCompletos: (dadosDataJud.assuntos || []).map(a => ({
      codigo: a.codigo,
      nome: a.nome
    })),
    
    // Movimentos expandidos (últimos 5 com details)
    ultimosMovimentos: (dadosDataJud.movimentos || []).slice(0, 5).map(m => ({
      codigo: m.codigo,
      nome: m.nome,
      dataHora: m.dataHora,
      complementosTabelados: m.complementosTabelados
    })),
    
    // Resumo para exibição rápida
    resumoProcesso: {
      numeroProcesso: dadosDataJud.numeroProcesso,
      numeroFormatado: formatarNumeroProcesso(dadosDataJud.numeroProcesso),
      classe: dadosDataJud.classe?.nome || 'N/A',
      tribunal: dadosDataJud.tribunal || 'N/A',
      status: mapearStatusProcesso(dadosDataJud.movimentos),
      dataAjuizamento: dadosDataJud.dataAjuizamento,
      ultimaAtualizacao: dadosDataJud.dataHoraUltimaAtualizacao,
      totalMovimentos: (dadosDataJud.movimentos || []).length,
      orgao: dadosDataJud.orgaoJulgador?.nome || 'N/A'
    },

    // Campos adicionais para compatibilidade com o sistema
    title: `${dadosDataJud.classe?.nome || 'Processo'} - ${formatarNumeroProcesso(dadosDataJud.numeroProcesso)}`,
    court: dadosDataJud.orgaoJulgador?.nome || 'Órgão não informado',
    startDate: dadosDataJud.dataAjuizamento ? formatarDataSegura(dadosDataJud.dataAjuizamento) : null,
    lastUpdate: dadosDataJud.dataHoraUltimaAtualizacao ? formatarDataSegura(dadosDataJud.dataHoraUltimaAtualizacao) : null,
    nextHearing: extrairDataAudiencia(dadosDataJud.movimentos),
    priority: 'normal',
    description: gerarDescricaoProcesso(dadosDataJud)
  };

  console.log('✅ Dados convertidos:', convertedData);
  return convertedData;
};

// Função auxiliar para extrair data de audiência dos movimentos
const extrairDataAudiencia = (movimentos) => {
  if (!movimentos || movimentos.length === 0) return null;

  // Procurar por movimentos que contenham "audiência" ou códigos específicos de audiência
  const movimentosAudiencia = movimentos.filter(movimento =>
    movimento.nome?.toLowerCase().includes('audiência') ||
    movimento.nome?.toLowerCase().includes('audiencia') ||
    [26, 27, 28, 29, 30, 31, 32, 33, 34, 35].includes(movimento.codigo) // Códigos comuns de audiência
  );

  if (movimentosAudiencia.length === 0) return null;

  // Pegar a audiência mais recente (última na lista)
  const ultimaAudiencia = movimentosAudiencia[movimentosAudiencia.length - 1];

  // Tentar extrair data do complemento ou da data do movimento
  if (ultimaAudiencia.dataHora) {
    return formatarDataSegura(ultimaAudiencia.dataHora);
  }

  return null;
};

// Função auxiliar para gerar descrição do processo
const gerarDescricaoProcesso = (dadosDataJud) => {
  const partes = [];

  if (dadosDataJud.classe?.nome) {
    partes.push(`Classe: ${dadosDataJud.classe.nome}`);
  }

  if (dadosDataJud.assuntos && dadosDataJud.assuntos.length > 0) {
    const assuntosStr = dadosDataJud.assuntos.map(a => a.nome).join(', ');
    partes.push(`Assuntos: ${assuntosStr}`);
  }

  if (dadosDataJud.orgaoJulgador?.nome) {
    partes.push(`Órgão: ${dadosDataJud.orgaoJulgador.nome}`);
  }

  if (dadosDataJud.grau) {
    partes.push(`Grau: ${dadosDataJud.grau}`);
  }

  if (dadosDataJud.sistema?.nome) {
    partes.push(`Sistema: ${dadosDataJud.sistema.nome}`);
  }

  if (dadosDataJud.formato?.nome) {
    partes.push(`Formato: ${dadosDataJud.formato.nome}`);
  }

  if (dadosDataJud.nivelSigilo) {
    partes.push(`Nível de Sigilo: ${dadosDataJud.nivelSigilo}`);
  }

  if (dadosDataJud.movimentos && dadosDataJud.movimentos.length > 0) {
    partes.push(`${dadosDataJud.movimentos.length} movimentações processuais`);
  }

  return partes.join(' | ');
};

// Mapear status baseado nas movimentações
function mapearStatusProcesso(movimentos) {
  if (!movimentos || movimentos.length === 0) {
    return 'Em andamento';
  }
  
  const ultimoMovimento = movimentos[movimentos.length - 1];
  const codigo = ultimoMovimento.codigo;
  
  // Códigos que indicam finalização
  if ([51, 267, 280, 11009].includes(codigo)) {
    return 'Finalizado';
  }
  
  // Códigos que indicam suspensão
  if ([1030, 1031, 1032].includes(codigo)) {
    return 'Suspenso';
  }
  
  return 'Em andamento';
}

// Export principal com todas as funções
export default {
  buscarProcessoPorNumero,
  buscarProcessosPorDocumento,
  buscarProcessosPorNome,
  buscarProcessosPorAdvogado,
  buscarProcessosPorParte,
  buscarEmTodosTribunais,
  obterMovimentacoesProcesso,
  buscarProcessoAvancado,
  buscarProcessoPorTexto,
  processarEntradaUsuario,
  validarNumeroProcessoCNJ,
  formatarNumeroProcesso,
  obterInfoTribunal,
  converterDadosDataJud,
  obterTribunaisPorCategoria,
  TRIBUNAIS
};
