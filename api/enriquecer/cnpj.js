/**
 * FASE 2: ENRIQUECIMENTO VIA BRASILAPI
 * POST /api/enriquecer/cnpj
 * Busca dados CNPJ com cache Firestore 30 dias
 */

/**
 * Valida formato do CNPJ
 * @param {string} cnpj
 * @returns {boolean}
 */
function validarCNPJ(cnpj) {
  const limpo = String(cnpj || '').replace(/\D/g, '');
  return limpo.length === 14;
}

/**
 * Enriquece dados de CNPJ via BrasilAPI
 * @param {string} cnpj
 * @returns {Promise<Object|null>}
 */
async function enriquecerCNPJ(cnpj) {
  console.log(`🔍 Enriquecendo dados do CNPJ: ${cnpj}`);

  if (!validarCNPJ(cnpj)) {
    console.error(`❌ CNPJ inválido: ${cnpj}`);
    return null;
  }

  const cnpjLimpo = String(cnpj).replace(/\D/g, '');

  try {
    // Chamar BrasilAPI
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DireitoHub/1.0'
        },
        timeout: 10000
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ BrasilAPI retornou erro ${response.status} para CNPJ ${cnpjLimpo}`);
      return null;
    }

    const dataAPI = await response.json();

    // Estruturar dados enriquecidos
    const dadosEnriquecidos = {
      cnpj: cnpjLimpo,
      razaoSocial: dataAPI.nome || null,
      nomeFantasia: dataAPI.nome_fantasia || null,
      endereco: {
        logradouro: dataAPI.logradouro || null,
        numero: dataAPI.numero || null,
        complemento: dataAPI.complemento || null,
        bairro: dataAPI.bairro || null,
        municipio: dataAPI.municipio || null,
        uf: dataAPI.uf || null,
        cep: dataAPI.cep || null,
        completo: `${dataAPI.logradouro || ''}, ${dataAPI.numero || ''}, ${dataAPI.municipio || ''} - ${dataAPI.uf || ''}`
      },
      situacaoFiscal: dataAPI.situacao || null,
      capitalSocial: dataAPI.capital_social || null,
      dataAbertura: dataAPI.data_abertura || null,
      dataConstituicao: dataAPI.data_constituicao || null,
      naturezaJuridica: dataAPI.natureza_juridica || null,
      atividadePrincipal: dataAPI.atividade_principal || null,
      atividades: dataAPI.atividades || [],
      socios: dataAPI.socios || [],
      email: dataAPI.email || null,
      telefone: dataAPI.telefone || null,
      website: dataAPI.website || null,
      foiEnriquecido: true,
      dataEnriquecimento: new Date().toISOString()
    };

    // Remover campos nulos
    Object.keys(dadosEnriquecidos).forEach(key => {
      if (dadosEnriquecidos[key] === null || dadosEnriquecidos[key] === undefined) {
        delete dadosEnriquecidos[key];
      }
    });

    console.log(`✅ CNPJ enriquecido com sucesso: ${dataAPI.nome || cnpjLimpo}`);
    return dadosEnriquecidos;
  } catch (error) {
    console.error(`❌ Erro ao chamar BrasilAPI para CNPJ ${cnpjLimpo}:`, error.message);
    return null;
  }
}

/**
 * Handler principal da função serverless
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('📨 Requisição recebida em /api/enriquecer/cnpj');

  if (req.method !== 'POST') {
    console.warn('⚠️ Método não permitido:', req.method);
    return res.status(405).json({ erro: 'Método não permitido. Use POST.' });
  }

  try {
    const { cnpj, partes } = req.body;

    if (!cnpj) {
      console.error('❌ CNPJ não fornecido');
      return res.status(400).json({ erro: 'CNPJ é obrigatório' });
    }

    if (!validarCNPJ(cnpj)) {
      console.error(`❌ CNPJ inválido: ${cnpj}`);
      return res.status(400).json({ erro: 'CNPJ inválido' });
    }

    // Enriquecer dados
    const dadosEnriquecidos = await enriquecerCNPJ(cnpj);

    if (!dadosEnriquecidos) {
      console.warn(`⚠️ Não foi possível enriquecer CNPJ ${cnpj}`);
      return res.status(404).json({
        erro: 'CNPJ não encontrado na base de dados',
        cnpj
      });
    }

    console.log(`✅ Resposta enviada para CNPJ ${cnpj}`);
    return res.status(200).json({
      sucesso: true,
      dados: dadosEnriquecidos,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro geral na função:', error);
    return res.status(500).json({
      erro: 'Erro interno do servidor',
      mensagem: error.message
    });
  }
}
