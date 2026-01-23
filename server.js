import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração da API DataJud
const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';
const API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

// Lista de tribunais disponíveis
const TRIBUNAIS = {
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
  TJDFT: { alias: 'api_publica_tjdft', nome: 'Tribunal de Justiça do Distrito Federal' },
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

// Função para fazer requisições à API DataJud
const makeDataJudRequest = async (tribunalAlias, query) => {
  const url = `${DATAJUD_BASE_URL}/${tribunalAlias}/_search`;
  
  console.log(`Fazendo requisição para: ${url}`);
  console.log(`Query:`, JSON.stringify(query, null, 2));
  
  try {
    const response = await axios.post(url, query, {
      headers: {
        'Authorization': `APIKey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 segundos
    });
    
    console.log(`Resposta do ${tribunalAlias}:`, response.data.hits?.total?.value || 0, 'resultados');
    return response.data;
  } catch (error) {
    console.error(`Erro ao consultar ${tribunalAlias}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    throw error;
  }
};

// Rota para buscar processo por número
app.post('/api/datajud/buscar-numero', async (req, res) => {
  try {
    const { numeroProcesso, tribunais = [] } = req.body;
    
    if (!numeroProcesso) {
      return res.status(400).json({ error: 'Número do processo é obrigatório' });
    }
    
    const query = {
      query: {
        match: {
          numeroProcesso: numeroProcesso.replace(/\D/g, '') // Remove formatação
        }
      },
      size: 10
    };
    
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : Object.keys(TRIBUNAIS);
    const resultados = [];
    
    // Buscar em paralelo em até 5 tribunais por vez para não sobrecarregar
    const batchSize = 5;
    for (let i = 0; i < tribunaisParaBuscar.length; i += batchSize) {
      const batch = tribunaisParaBuscar.slice(i, i + batchSize);
      
      const promises = batch.map(async (tribunal) => {
        try {
          const tribunalInfo = TRIBUNAIS[tribunal];
          if (!tribunalInfo) return null;
          
          const response = await makeDataJudRequest(tribunalInfo.alias, query);
          
          if (response.hits && response.hits.hits && response.hits.hits.length > 0) {
            return response.hits.hits.map(hit => ({
              ...hit._source,
              tribunal: tribunal,
              tribunalNome: tribunalInfo.nome,
              _id: hit._id,
              _score: hit._score
            }));
          }
          return null;
        } catch (error) {
          console.error(`Erro ao buscar no tribunal ${tribunal}:`, error.message);
          return null;
        }
      });
      
      const resultadosBatch = await Promise.all(promises);
      resultadosBatch.forEach(resultado => {
        if (resultado && resultado.length > 0) {
          resultados.push(...resultado);
        }
      });
    }
    
    res.json(resultados);
  } catch (error) {
    console.error('Erro na busca por número:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota para busca avançada
app.post('/api/datajud/buscar-avancado', async (req, res) => {
  try {
    const { criterios, tribunais = [] } = req.body;
    
    if (!criterios || Object.keys(criterios).length === 0) {
      return res.status(400).json({ error: 'Critérios de busca são obrigatórios' });
    }
    
    const mustQueries = [];
    
    // Construir query baseada nos critérios
    if (criterios.numeroProcesso) {
      mustQueries.push({
        match: {
          numeroProcesso: criterios.numeroProcesso.replace(/\D/g, '')
        }
      });
    }
    
    if (criterios.classeProcessual) {
      mustQueries.push({
        match: {
          'classe.codigo': criterios.classeProcessual
        }
      });
    }
    
    if (criterios.orgaoJulgador) {
      mustQueries.push({
        match: {
          'orgaoJulgador.codigo': criterios.orgaoJulgador
        }
      });
    }
    
    if (criterios.assunto) {
      mustQueries.push({
        match: {
          'assuntos.codigo': criterios.assunto
        }
      });
    }
    
    if (criterios.dataInicio || criterios.dataFim) {
      const rangeQuery = {};
      if (criterios.dataInicio) rangeQuery.gte = criterios.dataInicio;
      if (criterios.dataFim) rangeQuery.lte = criterios.dataFim;
      
      mustQueries.push({
        range: {
          dataAjuizamento: rangeQuery
        }
      });
    }
    
    if (criterios.grau) {
      mustQueries.push({
        match: {
          'grau': criterios.grau
        }
      });
    }
    
    if (mustQueries.length === 0) {
      return res.status(400).json({ error: 'Pelo menos um critério de busca deve ser informado' });
    }
    
    const query = {
      query: {
        bool: {
          must: mustQueries
        }
      },
      size: criterios.tamanho || 10,
      from: criterios.offset || 0
    };
    
    if (criterios.ordenacao) {
      query.sort = [
        { [criterios.ordenacao]: { order: criterios.direcaoOrdenacao || 'desc' } }
      ];
    }
    
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : Object.keys(TRIBUNAIS);
    const resultados = [];
    
    // Buscar em paralelo em até 5 tribunais por vez
    const batchSize = 5;
    for (let i = 0; i < tribunaisParaBuscar.length; i += batchSize) {
      const batch = tribunaisParaBuscar.slice(i, i + batchSize);
      
      const promises = batch.map(async (tribunal) => {
        try {
          const tribunalInfo = TRIBUNAIS[tribunal];
          if (!tribunalInfo) return null;
          
          const response = await makeDataJudRequest(tribunalInfo.alias, query);
          
          if (response.hits && response.hits.hits && response.hits.hits.length > 0) {
            return response.hits.hits.map(hit => ({
              ...hit._source,
              tribunal: tribunal,
              tribunalNome: tribunalInfo.nome,
              _id: hit._id,
              _score: hit._score
            }));
          }
          return null;
        } catch (error) {
          console.error(`Erro ao buscar no tribunal ${tribunal}:`, error.message);
          return null;
        }
      });
      
      const resultadosBatch = await Promise.all(promises);
      resultadosBatch.forEach(resultado => {
        if (resultado && resultado.length > 0) {
          resultados.push(...resultado);
        }
      });
    }
    
    res.json(resultados);
  } catch (error) {
    console.error('Erro na busca avançada:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota para busca por texto
app.post('/api/datajud/buscar-texto', async (req, res) => {
  try {
    const { texto, tribunais = [] } = req.body;
    
    if (!texto || texto.trim() === '') {
      return res.status(400).json({ error: 'Texto para busca é obrigatório' });
    }
    
    const query = {
      query: {
        multi_match: {
          query: texto,
          fields: ['numeroProcesso', 'classe.nome', 'orgaoJulgador.nome', 'assuntos.nome']
        }
      },
      size: 10
    };
    
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : Object.keys(TRIBUNAIS);
    const resultados = [];
    
    // Buscar em paralelo em até 5 tribunais por vez
    const batchSize = 5;
    for (let i = 0; i < tribunaisParaBuscar.length; i += batchSize) {
      const batch = tribunaisParaBuscar.slice(i, i + batchSize);
      
      const promises = batch.map(async (tribunal) => {
        try {
          const tribunalInfo = TRIBUNAIS[tribunal];
          if (!tribunalInfo) return null;
          
          const response = await makeDataJudRequest(tribunalInfo.alias, query);
          
          if (response.hits && response.hits.hits && response.hits.hits.length > 0) {
            return response.hits.hits.map(hit => ({
              ...hit._source,
              tribunal: tribunal,
              tribunalNome: tribunalInfo.nome,
              _id: hit._id,
              _score: hit._score
            }));
          }
          return null;
        } catch (error) {
          console.error(`Erro ao buscar no tribunal ${tribunal}:`, error.message);
          return null;
        }
      });
      
      const resultadosBatch = await Promise.all(promises);
      resultadosBatch.forEach(resultado => {
        if (resultado && resultado.length > 0) {
          resultados.push(...resultado);
        }
      });
    }
    
    res.json(resultados);
  } catch (error) {
    console.error('Erro na busca por texto:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota para busca por nome de advogado
app.post('/api/datajud/buscar-advogado', async (req, res) => {
  try {
    const { nomeAdvogado, tribunais = [] } = req.body;
    
    if (!nomeAdvogado || nomeAdvogado.trim() === '') {
      return res.status(400).json({ error: 'Nome do advogado é obrigatório' });
    }
    
    // Busca por texto livre pode encontrar menções ao nome
    const query = {
      query: {
        multi_match: {
          query: nomeAdvogado,
          fields: ['numeroProcesso', 'classe.nome', 'orgaoJulgador.nome', 'assuntos.nome', 'movimentos.nome']
        }
      },
      size: 10
    };
    
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : Object.keys(TRIBUNAIS);
    const resultados = [];
    
    // Buscar em paralelo em até 5 tribunais por vez
    const batchSize = 5;
    for (let i = 0; i < tribunaisParaBuscar.length; i += batchSize) {
      const batch = tribunaisParaBuscar.slice(i, i + batchSize);
      
      const promises = batch.map(async (tribunal) => {
        try {
          const tribunalInfo = TRIBUNAIS[tribunal];
          if (!tribunalInfo) return null;
          
          const response = await makeDataJudRequest(tribunalInfo.alias, query);
          
          if (response.hits && response.hits.hits && response.hits.hits.length > 0) {
            return response.hits.hits.map(hit => ({
              ...hit._source,
              tribunal: tribunal,
              tribunalNome: tribunalInfo.nome,
              _id: hit._id,
              _score: hit._score
            }));
          }
          return null;
        } catch (error) {
          console.error(`Erro ao buscar no tribunal ${tribunal}:`, error.message);
          return null;
        }
      });
      
      const resultadosBatch = await Promise.all(promises);
      resultadosBatch.forEach(resultado => {
        if (resultado && resultado.length > 0) {
          resultados.push(...resultado);
        }
      });
    }
    
    res.json(resultados);
  } catch (error) {
    console.error('Erro na busca por advogado:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota para busca por nome de parte
app.post('/api/datajud/buscar-parte', async (req, res) => {
  try {
    const { nomeParte, tribunais = [] } = req.body;
    
    if (!nomeParte || nomeParte.trim() === '') {
      return res.status(400).json({ error: 'Nome da parte é obrigatório' });
    }
    
    // Busca por texto livre pode encontrar menções ao nome
    const query = {
      query: {
        multi_match: {
          query: nomeParte,
          fields: ['numeroProcesso', 'classe.nome', 'orgaoJulgador.nome', 'assuntos.nome', 'movimentos.nome']
        }
      },
      size: 10
    };
    
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : Object.keys(TRIBUNAIS);
    const resultados = [];
    
    // Buscar em paralelo em até 5 tribunais por vez
    const batchSize = 5;
    for (let i = 0; i < tribunaisParaBuscar.length; i += batchSize) {
      const batch = tribunaisParaBuscar.slice(i, i + batchSize);
      
      const promises = batch.map(async (tribunal) => {
        try {
          const tribunalInfo = TRIBUNAIS[tribunal];
          if (!tribunalInfo) return null;
          
          const response = await makeDataJudRequest(tribunalInfo.alias, query);
          
          if (response.hits && response.hits.hits && response.hits.hits.length > 0) {
            return response.hits.hits.map(hit => ({
              ...hit._source,
              tribunal: tribunal,
              tribunalNome: tribunalInfo.nome,
              _id: hit._id,
              _score: hit._score
            }));
          }
          return null;
        } catch (error) {
          console.error(`Erro ao buscar no tribunal ${tribunal}:`, error.message);
          return null;
        }
      });
      
      const resultadosBatch = await Promise.all(promises);
      resultadosBatch.forEach(resultado => {
        if (resultado && resultado.length > 0) {
          resultados.push(...resultado);
        }
      });
    }
    
    res.json(resultados);
  } catch (error) {
    console.error('Erro na busca por parte:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota para obter lista de tribunais
app.get('/api/datajud/tribunais', (req, res) => {
  const categorias = {
    'Tribunais Superiores': ['STF', 'STJ', 'TST', 'TSE', 'STM'],
    'Tribunais Regionais Federais': ['TRF1', 'TRF2', 'TRF3', 'TRF4', 'TRF5', 'TRF6'],
    'Tribunais de Justiça': ['TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TJPR', 'TJSC', 'TJBA', 'TJGO', 'TJDFT', 'TJPE', 'TJCE', 'TJMT', 'TJMS', 'TJPB', 'TJAL', 'TJSE', 'TJRN', 'TJPI', 'TJMA', 'TJPA', 'TJAP', 'TJAM', 'TJRR', 'TJAC', 'TJRO', 'TJTO', 'TJES'],
    'Tribunais Regionais do Trabalho': ['TRT1', 'TRT2', 'TRT3', 'TRT4', 'TRT5', 'TRT6', 'TRT7', 'TRT8', 'TRT9', 'TRT10', 'TRT11', 'TRT12', 'TRT13', 'TRT14', 'TRT15', 'TRT16', 'TRT17', 'TRT18', 'TRT19', 'TRT20', 'TRT21', 'TRT22', 'TRT23', 'TRT24'],
    'Tribunais Regionais Eleitorais': ['TRESP', 'TRERJ', 'TREMG', 'TRERS', 'TREPR', 'TRESC', 'TREBA', 'TREGO', 'TREDF']
  };
  
  res.json({ tribunais: TRIBUNAIS, categorias });
});

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor DataJud funcionando' });
});

// OpenAI API Proxy Routes
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY não configurada no servidor');
}

// Proxy para OpenAI Chat Completions
app.post('/api/openai/chat/completions', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }

    console.log('🔄 Proxy OpenAI Chat Completions - Recebida requisição');

    const response = await axios.post('https://api.openai.com/v1/chat/completions', req.body, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 segundos timeout
    });

    console.log('✅ Proxy OpenAI - Resposta recebida com sucesso');
    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro no proxy OpenAI Chat:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Proxy para OpenAI Models (para validação)
app.get('/api/openai/models', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }

    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro no proxy OpenAI Models:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Proxy para OpenAI Embeddings
app.post('/api/openai/embeddings', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }

    const response = await axios.post('https://api.openai.com/v1/embeddings', req.body, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro no proxy OpenAI Embeddings:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor DataJud rodando na porta ${port}`);
  console.log(`📡 API disponível em http://localhost:${port}/api/datajud`);
  console.log(`🔗 Conectando com ${DATAJUD_BASE_URL}`);
});

export default app;
