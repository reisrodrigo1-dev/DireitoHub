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
        const response = await fetch(TRIBUNAIS[tribunal], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `APIKey ${API_KEY}`,
            'User-Agent': 'DireitoHub/1.0'
          },
          body: JSON.stringify(query)
        });

        if (response.ok) {
          const data = await response.json();

          if (data.hits && data.hits.hits && data.hits.hits.length > 0) {
            return res.status(200).json({
              success: true,
              data: data.hits.hits.map(hit => hit._source),
              tribunal: tribunal,
              total: data.hits.total.value || data.hits.total
            });
          }
        }
      } catch (error) {
        console.error(`Erro ao buscar no tribunal ${tribunal}:`, error);
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Processo não encontrado'
    });

  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}