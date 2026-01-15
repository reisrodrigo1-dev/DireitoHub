import { NextApiRequest, NextApiResponse } from 'next';

const API_KEY = process.env.DATAJUD_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

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
  // Adicione mais tribunais conforme necessário
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

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
        const response = await fetch(TRIBUNAIS[tribunal], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `APIKey ${API_KEY}`,
            'User-Agent': 'DireitoHub/1.0'
          },
          body: JSON.stringify(queryObj)
        });

        if (response.ok) {
          const data = await response.json();

          if (data.hits && data.hits.hits && data.hits.hits.length > 0) {
            const processosConvertidos = data.hits.hits.map(hit => hit._source);
            todosResultados = todosResultados.concat(processosConvertidos);
            tribunaisBuscados.push(tribunal);
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar no tribunal ${tribunal}:`, error);
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
    console.error('Erro na API:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}