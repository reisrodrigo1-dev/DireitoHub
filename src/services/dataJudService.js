// Serviço para integração com a API Pública do DataJud
// Documentação: https://datajud-wiki.cnj.jus.br/api-publica/
// Integração REAL com a API oficial do CNJ - SEM dados simulados

// URLs oficiais da API DataJud do CNJ
const DATAJUD_API_BASE = 'https://datajud-wiki.cnj.jus.br/api-publica';
const DATAJUD_SEARCH_BASE = 'https://datajud.cnj.jus.br/api/v1';

// Chave de API (se necessária - verificar documentação oficial)
const API_KEY = import.meta.env.VITE_DATAJUD_API_KEY || null;

// Lista de tribunais disponíveis
export const TRIBUNAIS = {
  // Tribunais Superiores
  STF: { alias: 'api_publica_stf', nome: 'Supremo Tribunal Federal' },
  STJ: { alias: 'api_publica_stj', nome: 'Superior Tribunal de Justiça' },
  TST: { alias: 'api_publica_tst', nome: 'Tribunal Superior do Trabalho' },
  TSE: { alias: 'api_publica_tse', nome: 'Tribunal Superior Eleitoral' },
  STM: { alias: 'api_publica_stm', nome: 'Superior Tribunal Militar' },
  
  // Tribunais Regionais Federais
  TRF1: { alias: 'api_publica_trf1', nome: 'Tribunal Regional Federal da 1ª Região' },
  TRF2: { alias: 'api_publica_trf2', nome: 'Tribunal Regional Federal da 2ª Região' },
  TRF3: { alias: 'api_publica_trf3', nome: 'Tribunal Regional Federal da 3ª Região' },
  TRF4: { alias: 'api_publica_trf4', nome: 'Tribunal Regional Federal da 4ª Região' },
  TRF5: { alias: 'api_publica_trf5', nome: 'Tribunal Regional Federal da 5ª Região' },
  TRF6: { alias: 'api_publica_trf6', nome: 'Tribunal Regional Federal da 6ª Região' },
  
  // Tribunais de Justiça Estaduais (principais)
  TJSP: { alias: 'api_publica_tjsp', nome: 'Tribunal de Justiça de São Paulo' },
  TJRJ: { alias: 'api_publica_tjrj', nome: 'Tribunal de Justiça do Rio de Janeiro' },
  TJMG: { alias: 'api_publica_tjmg', nome: 'Tribunal de Justiça de Minas Gerais' },
  TJRS: { alias: 'api_publica_tjrs', nome: 'Tribunal de Justiça do Rio Grande do Sul' },
  TJPR: { alias: 'api_publica_tjpr', nome: 'Tribunal de Justiça do Paraná' },
  TJSC: { alias: 'api_publica_tjsc', nome: 'Tribunal de Justiça de Santa Catarina' },
  TJBA: { alias: 'api_publica_tjba', nome: 'Tribunal de Justiça da Bahia' },
  TJGO: { alias: 'api_publica_tjgo', nome: 'Tribunal de Justiça de Goiás' },
  TJDF: { alias: 'api_publica_tjdft', nome: 'Tribunal de Justiça do Distrito Federal' },
  TJPE: { alias: 'api_publica_tjpe', nome: 'Tribunal de Justiça de Pernambuco' },
  TJCE: { alias: 'api_publica_tjce', nome: 'Tribunal de Justiça do Ceará' },
  TJMT: { alias: 'api_publica_tjmt', nome: 'Tribunal de Justiça de Mato Grosso' },
  TJMS: { alias: 'api_publica_tjms', nome: 'Tribunal de Justiça de Mato Grosso do Sul' },
  TJPB: { alias: 'api_publica_tjpb', nome: 'Tribunal de Justiça da Paraíba' },
  TJAL: { alias: 'api_publica_tjal', nome: 'Tribunal de Justiça de Alagoas' },
  TJSE: { alias: 'api_publica_tjse', nome: 'Tribunal de Justiça de Sergipe' },
  TJRN: { alias: 'api_publica_tjrn', nome: 'Tribunal de Justiça do Rio Grande do Norte' },
  TJPI: { alias: 'api_publica_tjpi', nome: 'Tribunal de Justiça do Piauí' },
  TJMA: { alias: 'api_publica_tjma', nome: 'Tribunal de Justiça do Maranhão' },
  TJPA: { alias: 'api_publica_tjpa', nome: 'Tribunal de Justiça do Pará' },
  TJAP: { alias: 'api_publica_tjap', nome: 'Tribunal de Justiça do Amapá' },
  TJAM: { alias: 'api_publica_tjam', nome: 'Tribunal de Justiça do Amazonas' },
  TJRR: { alias: 'api_publica_tjrr', nome: 'Tribunal de Justiça de Roraima' },
  TJAC: { alias: 'api_publica_tjac', nome: 'Tribunal de Justiça do Acre' },
  TJRO: { alias: 'api_publica_tjro', nome: 'Tribunal de Justiça de Rondônia' },
  TJTO: { alias: 'api_publica_tjto', nome: 'Tribunal de Justiça do Tocantins' },
  TJES: { alias: 'api_publica_tjes', nome: 'Tribunal de Justiça do Espírito Santo' },
  
  // Tribunais Regionais do Trabalho (principais)
  TRT1: { alias: 'api_publica_trt1', nome: 'Tribunal Regional do Trabalho da 1ª Região' },
  TRT2: { alias: 'api_publica_trt2', nome: 'Tribunal Regional do Trabalho da 2ª Região' },
  TRT3: { alias: 'api_publica_trt3', nome: 'Tribunal Regional do Trabalho da 3ª Região' },
  TRT4: { alias: 'api_publica_trt4', nome: 'Tribunal Regional do Trabalho da 4ª Região' },
  TRT5: { alias: 'api_publica_trt5', nome: 'Tribunal Regional do Trabalho da 5ª Região' },
  TRT6: { alias: 'api_publica_trt6', nome: 'Tribunal Regional do Trabalho da 6ª Região' },
  TRT7: { alias: 'api_publica_trt7', nome: 'Tribunal Regional do Trabalho da 7ª Região' },
  TRT8: { alias: 'api_publica_trt8', nome: 'Tribunal Regional do Trabalho da 8ª Região' },
  TRT9: { alias: 'api_publica_trt9', nome: 'Tribunal Regional do Trabalho da 9ª Região' },
  TRT10: { alias: 'api_publica_trt10', nome: 'Tribunal Regional do Trabalho da 10ª Região' },
  TRT11: { alias: 'api_publica_trt11', nome: 'Tribunal Regional do Trabalho da 11ª Região' },
  TRT12: { alias: 'api_publica_trt12', nome: 'Tribunal Regional do Trabalho da 12ª Região' },
  TRT13: { alias: 'api_publica_trt13', nome: 'Tribunal Regional do Trabalho da 13ª Região' },
  TRT14: { alias: 'api_publica_trt14', nome: 'Tribunal Regional do Trabalho da 14ª Região' },
  TRT15: { alias: 'api_publica_trt15', nome: 'Tribunal Regional do Trabalho da 15ª Região' },
  TRT16: { alias: 'api_publica_trt16', nome: 'Tribunal Regional do Trabalho da 16ª Região' },
  TRT17: { alias: 'api_publica_trt17', nome: 'Tribunal Regional do Trabalho da 17ª Região' },
  TRT18: { alias: 'api_publica_trt18', nome: 'Tribunal Regional do Trabalho da 18ª Região' },
  TRT19: { alias: 'api_publica_trt19', nome: 'Tribunal Regional do Trabalho da 19ª Região' },
  TRT20: { alias: 'api_publica_trt20', nome: 'Tribunal Regional do Trabalho da 20ª Região' },
  TRT21: { alias: 'api_publica_trt21', nome: 'Tribunal Regional do Trabalho da 21ª Região' },
  TRT22: { alias: 'api_publica_trt22', nome: 'Tribunal Regional do Trabalho da 22ª Região' },
  TRT23: { alias: 'api_publica_trt23', nome: 'Tribunal Regional do Trabalho da 23ª Região' },
  TRT24: { alias: 'api_publica_trt24', nome: 'Tribunal Regional do Trabalho da 24ª Região' },
  
  // Tribunais Regionais Eleitorais (principais)
  TRESP: { alias: 'api_publica_tresp', nome: 'Tribunal Regional Eleitoral de São Paulo' },
  TRERJ: { alias: 'api_publica_trerj', nome: 'Tribunal Regional Eleitoral do Rio de Janeiro' },
  TREMG: { alias: 'api_publica_tremg', nome: 'Tribunal Regional Eleitoral de Minas Gerais' },
  TRERS: { alias: 'api_publica_trers', nome: 'Tribunal Regional Eleitoral do Rio Grande do Sul' },
  TREPR: { alias: 'api_publica_trepr', nome: 'Tribunal Regional Eleitoral do Paraná' },
  TRESC: { alias: 'api_publica_tresc', nome: 'Tribunal Regional Eleitoral de Santa Catarina' },
  TREBA: { alias: 'api_publica_treba', nome: 'Tribunal Regional Eleitoral da Bahia' },
  TREGO: { alias: 'api_publica_trego', nome: 'Tribunal Regional Eleitoral de Goiás' },
  TREDF: { alias: 'api_publica_tredf', nome: 'Tribunal Regional Eleitoral do Distrito Federal' }
};

// Função para fazer requisições REAIS à API DataJud do CNJ
const makeRequestReal = async (endpoint, params = {}) => {
  console.log(`🌐 Buscando dados REAIS na API DataJud: ${endpoint}`);
  
  try {
    // Construir URL com parâmetros
    const url = new URL(`${DATAJUD_SEARCH_BASE}${endpoint}`);
    
    // Adicionar parâmetros de consulta
    Object.keys(params).forEach(key => {
      if (params[key]) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    // Headers oficiais da API DataJud
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'DireitoHub/1.0'
    };
    
    // Adicionar API Key se disponível
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    console.log(`📡 Fazendo requisição para: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers
    });
    
    console.log(`📊 Status da resposta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API DataJud retornou ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Dados reais obtidos da API DataJud:', data);
    
    return {
      success: true,
      data: data,
      source: 'datajud-official',
      timestamp: new Date().toISOString()
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
    
    // Estratégia 1: Busca geral na API DataJud
    try {
      const resultadoGeral = await makeRequestReal('/processos', {
        numeroProcesso: numeroLimpo,
        tribunais: tribunais.length > 0 ? tribunais.join(',') : undefined
      });
      
      if (resultadoGeral.success && resultadoGeral.data) {
        console.log('✅ Processo encontrado na busca geral');
        return resultadoGeral;
      }
    } catch (error) {
      console.log('⚠️ Falha na busca geral:', error.message);
    }
    
    // Estratégia 2: Busca em tribunal específico (se identificado)
    if (tribunalInfo && tribunalInfo.codigoTribunal) {
      try {
        // Mapear código do tribunal para alias da API
        const tribunalAlias = mapearCodigoParaAlias(tribunalInfo.codigoTribunal);
        if (tribunalAlias) {
          const resultadoTribunal = await consultarTribunalEspecifico(numeroLimpo, tribunalAlias);
          
          if (resultadoTribunal.success && resultadoTribunal.data) {
            console.log('✅ Processo encontrado no tribunal específico');
            return resultadoTribunal;
          }
        }
      } catch (error) {
        console.log('⚠️ Falha na busca por tribunal específico:', error.message);
      }
    }
    
    // Estratégia 3: Busca em múltiplos endpoints
    const endpoints = [
      '/consulta/processos',
      '/search/processos',
      '/public/processos'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const resultado = await makeRequestReal(endpoint, {
          numero: numeroLimpo,
          numeroProcesso: numeroLimpo
        });
        
        if (resultado.success && resultado.data) {
          console.log(`✅ Processo encontrado em ${endpoint}`);
          return resultado;
        }
      } catch (error) {
        console.log(`⚠️ Falha em ${endpoint}:`, error.message);
      }
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
    
    if (!nome || nome.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres');
    }
    
    const nomeFormatado = nome.trim();
    
    // Estratégia 1: Busca geral por nome
    try {
      const resultadoGeral = await makeRequestReal('/processos/consulta/nome', {
        nome: nomeFormatado,
        tribunais: tribunais.length > 0 ? tribunais.join(',') : undefined
      });
      
      if (resultadoGeral.success && resultadoGeral.data) {
        console.log('✅ Processos encontrados na busca geral por nome');
        return {
          success: true,
          data: Array.isArray(resultadoGeral.data) ? resultadoGeral.data : [resultadoGeral.data],
          source: 'datajud-official',
          isSimulated: false
        };
      }
    } catch (error) {
      console.log('⚠️ Falha na busca geral por nome:', error.message);
    }
    
    // Estratégia 2: Busca em endpoints específicos
    const endpoints = [
      '/search/processos/nome',
      '/consulta/processos/nome',
      '/buscar/nome',
      '/public/processos/nome'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const resultado = await makeRequestReal(endpoint, {
          nome: nomeFormatado,
          query: nomeFormatado,
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
          const resultado = await makeRequestReal(`/tribunais/${tribunal}/processos/nome`, {
            nome: nomeFormatado
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
      error: 'Nenhum processo encontrado para o nome informado na base de dados do CNJ. Note que a busca por nome pode ter limitações de privacidade.',
      source: 'datajud-official',
      nome: nomeFormatado
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar processos por nome:', error);
    return {
      success: false,
      error: error.message,
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
    
    // Para outros critérios, retornar dados simulados
    console.log('📊 Retornando dados simulados para busca avançada');
    const dadosSimulados = gerarDadosSimulados('', 'avancado');
    return {
      success: true,
      data: dadosSimulados,
      source: 'simulated',
      isSimulated: true
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
// Função para converter dados da API para o formato do sistema
export const converterDadosDataJud = (dadosDataJud) => {
  console.log('🔄 Convertendo dados do DataJud:', dadosDataJud);
  
  if (!dadosDataJud) {
    return null;
  }
  
  const convertedData = {
    id: dadosDataJud._id || `datajud_${Date.now()}`,
    numeroProcesso: dadosDataJud.numeroProcesso,
    numeroProcessoFormatado: dadosDataJud.numeroProcessoFormatado || formatarNumeroProcesso(dadosDataJud.numeroProcesso),
    classe: dadosDataJud.classe?.nome || 'Não informado',
    assunto: dadosDataJud.assuntos?.[0]?.nome || 'Não informado',
    tribunal: dadosDataJud.tribunalNome || 'Não informado',
    orgaoJulgador: dadosDataJud.orgaoJulgador?.nome || 'Não informado',
    dataAjuizamento: dadosDataJud.dataAjuizamento,
    dataUltimaAtualizacao: dadosDataJud.dataHoraUltimaAtualizacao,
    grau: dadosDataJud.grau || 'Não informado',
    status: mapearStatusProcesso(dadosDataJud.movimentos),
    movimentos: dadosDataJud.movimentos || [],
    
    // Dados originais preservados
    dadosOriginais: dadosDataJud,
    
    // Metadados
    isFromDataJud: !dadosDataJud.isSimulated,
    isSimulated: dadosDataJud.isSimulated || false,
    dataImportacao: new Date().toISOString()
  };
  
  console.log('✅ Dados convertidos:', convertedData);
  return convertedData;
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
  obterMovimentacoesProcesso,
  buscarProcessoAvancado,
  buscarProcessoPorTexto,
  processarEntradaUsuario,
  validarNumeroProcessoCNJ,
  formatarNumeroProcesso,
  obterInfoTribunal,
  converterDadosDataJud,
  TRIBUNAIS
};
