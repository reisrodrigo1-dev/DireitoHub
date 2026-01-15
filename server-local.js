import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração da API DataJud
const DATAJUD_BASE_URL = 'https://api-publica.datajud.cnj.jus.br';
const API_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

// Mapeamento de tribunais para endpoints
const TRIBUNAIS = {
  TJSP: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search',
  TJRJ: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search',
  TJMG: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmg/_search',
  TJRS: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrs/_search',
  TJPR: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search',
  TJSC: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsc/_search',
  TJBA: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjba/_search',
  TJGO: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjgo/_search',
  TJDFT: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search',
  TJPE: 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpe/_search',
};

// Endpoint para busca por número do processo
app.post('/api/datajud/buscar-numero', async (req, res) => {
  console.log('🔍 Busca por número:', req.body);

  try {
    const { numeroProcesso, tribunais = [] } = req.body;

    if (!numeroProcesso) {
      return res.status(400).json({ error: 'Número do processo é obrigatório' });
    }

    // Query Elasticsearch
    const query = {
      "query": {
        "bool": {
          "must": [
            {
              "term": {
                "numeroProcesso": numeroProcesso.replace(/\D/g, '')
              }
            }
          ]
        }
      },
      "size": 10,
      "_source": [
        "id", "numeroProcesso", "numeroProcessoFormatado", "tribunal", "grau",
        "nivelSigilo", "dataAjuizamento", "dataUltimaAtualizacao", "orgaoJulgador",
        "orgaoJulgador.nome", "orgaoJulgador.codigo", "classe", "classe.nome",
        "classe.codigo", "assuntos", "assuntos.nome", "assuntos.codigo",
        "movimentos", "movimentos.dataHora", "movimentos.complementosTabelados",
        "movimentos.nome", "movimentos.codigo", "partes", "partes.nome",
        "partes.tipoPessoa", "partes.polo", "representantes", "representantes.nome",
        "representantes.tipoPessoa", "valorCausa", "dataHoraUltimaAtualizacao", "numeroUnico"
      ]
    };

    // Lista de tribunais para buscar
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : ['TJSP', 'TJRJ', 'TJMG', 'TJRS'];

    for (const tribunal of tribunaisParaBuscar) {
      if (!TRIBUNAIS[tribunal]) continue;

      try {
        console.log(`🔍 Buscando no tribunal ${tribunal}...`);
        const response = await axios.post(TRIBUNAIS[tribunal], query, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `APIKey ${API_KEY}`,
            'User-Agent': 'DireitoHub/1.0'
          }
        });

        if (response.data && response.data.hits && response.data.hits.hits && response.data.hits.hits.length > 0) {
          console.log(`✅ Processo encontrado no tribunal ${tribunal}`);
          return res.status(200).json({
            success: true,
            data: response.data.hits.hits.map(hit => hit._source),
            tribunal: tribunal,
            total: response.data.hits.total.value || response.data.hits.total
          });
        }
      } catch (error) {
        console.log(`⚠️ Erro no tribunal ${tribunal}:`, error.message);
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Processo não encontrado'
    });

  } catch (error) {
    console.error('❌ Erro na busca por número:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Endpoint para busca por advogado
app.post('/api/datajud/buscar-advogado', async (req, res) => {
  console.log('🔍 Busca por advogado:', req.body);

  try {
    const { nomeAdvogado, tribunais = [] } = req.body;

    if (!nomeAdvogado || nomeAdvogado.trim().length < 3) {
      return res.status(400).json({ error: 'Nome do advogado deve ter pelo menos 3 caracteres' });
    }

    // Query Elasticsearch para busca por advogado
    const query = {
      "query": {
        "bool": {
          "should": [
            {
              "match_phrase": {
                "representantes.nome": nomeAdvogado.trim()
              }
            },
            {
              "wildcard": {
                "representantes.nome": `*${nomeAdvogado.trim()}*`
              }
            }
          ],
          "minimum_should_match": 1
        }
      },
      "size": 50,
      "_source": [
        "id", "numeroProcesso", "numeroProcessoFormatado", "tribunal", "grau",
        "nivelSigilo", "dataAjuizamento", "dataUltimaAtualizacao", "orgaoJulgador",
        "orgaoJulgador.nome", "orgaoJulgador.codigo", "classe", "classe.nome",
        "classe.codigo", "assuntos", "assuntos.nome", "assuntos.codigo",
        "movimentos", "movimentos.dataHora", "movimentos.complementosTabelados",
        "movimentos.nome", "movimentos.codigo", "partes", "partes.nome",
        "partes.tipoPessoa", "partes.polo", "representantes", "representantes.nome",
        "representantes.tipoPessoa", "valorCausa", "dataHoraUltimaAtualizacao", "numeroUnico"
      ]
    };

    let todosResultados = [];
    let tribunaisBuscados = [];

    // Lista de tribunais para buscar
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : ['TJSP', 'TJRJ', 'TJMG', 'TJRS'];

    for (const tribunal of tribunaisParaBuscar) {
      if (!TRIBUNAIS[tribunal]) continue;

      try {
        console.log(`🔍 Buscando no tribunal ${tribunal}...`);
        const response = await axios.post(TRIBUNAIS[tribunal], query, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `APIKey ${API_KEY}`,
            'User-Agent': 'DireitoHub/1.0'
          }
        });

        if (response.data && response.data.hits && response.data.hits.hits && response.data.hits.hits.length > 0) {
          const processosConvertidos = response.data.hits.hits.map(hit => hit._source);
          todosResultados = todosResultados.concat(processosConvertidos);
          tribunaisBuscados.push(tribunal);
          console.log(`✅ Encontrados ${processosConvertidos.length} processos no tribunal ${tribunal}`);
        }
      } catch (error) {
        console.log(`⚠️ Erro no tribunal ${tribunal}:`, error.message);
      }
    }

    // Remover duplicatas baseadas no numeroProcesso
    const processosUnicos = todosResultados.filter((processo, index, self) =>
      index === self.findIndex(p => p.numeroProcesso === processo.numeroProcesso)
    );

    return res.status(200).json({
      success: true,
      data: processosUnicos,
      total: processosUnicos.length,
      tribunaisBuscados: tribunaisBuscados,
      message: processosUnicos.length > 0 ?
        `Encontrados ${processosUnicos.length} processos para o advogado "${nomeAdvogado}"` :
        `Nenhum processo encontrado para o advogado "${nomeAdvogado}"`
    });

  } catch (error) {
    console.error('❌ Erro na busca por advogado:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Endpoint para busca por nome/texto
app.post('/api/datajud/buscar-nome', async (req, res) => {
  console.log('🔍 Busca por nome/texto:', req.body);

  try {
    const { nome, query, tribunais = [] } = req.body;

    const searchTerm = nome || query;
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 2 caracteres' });
    }

    // Query Elasticsearch para busca por texto livre
    const queryObj = {
      "query": {
        "bool": {
          "should": [
            {
              "match_phrase": {
                "assuntos.nome": searchTerm.trim()
              }
            },
            {
              "match_phrase": {
                "classe.nome": searchTerm.trim()
              }
            },
            {
              "wildcard": {
                "assuntos.nome": `*${searchTerm.trim()}*`
              }
            },
            {
              "wildcard": {
                "classe.nome": `*${searchTerm.trim()}*`
              }
            }
          ],
          "minimum_should_match": 1
        }
      },
      "size": 50,
      "_source": [
        "id", "numeroProcesso", "numeroProcessoFormatado", "tribunal", "grau",
        "nivelSigilo", "dataAjuizamento", "dataUltimaAtualizacao", "orgaoJulgador",
        "orgaoJulgador.nome", "orgaoJulgador.codigo", "classe", "classe.nome",
        "classe.codigo", "assuntos", "assuntos.nome", "assuntos.codigo",
        "movimentos", "movimentos.dataHora", "movimentos.complementosTabelados",
        "movimentos.nome", "movimentos.codigo", "partes", "partes.nome",
        "partes.tipoPessoa", "partes.polo", "representantes", "representantes.nome",
        "representantes.tipoPessoa", "valorCausa", "dataHoraUltimaAtualizacao", "numeroUnico"
      ]
    };

    let todosResultados = [];
    let tribunaisBuscados = [];

    // Lista de tribunais para buscar
    const tribunaisParaBuscar = tribunais.length > 0 ? tribunais : ['TJSP', 'TJRJ', 'TJMG', 'TJRS'];

    for (const tribunal of tribunaisParaBuscar) {
      if (!TRIBUNAIS[tribunal]) continue;

      try {
        console.log(`🔍 Buscando no tribunal ${tribunal}...`);
        const response = await axios.post(TRIBUNAIS[tribunal], queryObj, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `APIKey ${API_KEY}`,
            'User-Agent': 'DireitoHub/1.0'
          }
        });

        if (response.data && response.data.hits && response.data.hits.hits && response.data.hits.hits.length > 0) {
          const processosConvertidos = response.data.hits.hits.map(hit => hit._source);
          todosResultados = todosResultados.concat(processosConvertidos);
          tribunaisBuscados.push(tribunal);
          console.log(`✅ Encontrados ${processosConvertidos.length} processos no tribunal ${tribunal}`);
        }
      } catch (error) {
        console.log(`⚠️ Erro no tribunal ${tribunal}:`, error.message);
      }
    }

    // Remover duplicatas baseadas no numeroProcesso
    const processosUnicos = todosResultados.filter((processo, index, self) =>
      index === self.findIndex(p => p.numeroProcesso === processo.numeroProcesso)
    );

    return res.status(200).json({
      success: true,
      data: processosUnicos,
      total: processosUnicos.length,
      tribunaisBuscados: tribunaisBuscados,
      message: processosUnicos.length > 0 ?
        `Encontrados ${processosUnicos.length} processos para "${searchTerm}"` :
        `Nenhum processo encontrado para "${searchTerm}"`
    });

  } catch (error) {
    console.error('❌ Erro na busca por nome/texto:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor local de desenvolvimento funcionando' });
});

app.listen(port, () => {
  console.log(`🚀 Servidor local de desenvolvimento rodando na porta ${port}`);
  console.log(`📡 API disponível em http://localhost:${port}/api/datajud`);
  console.log(`🔗 Conectando com https://api-publica.datajud.cnj.jus.br`);
});