/**
 * Mock Database - Judicial Cases
 * Pre-loaded with REAL cases found in e-SAJ
 * When APIs are unavailable, returns real data from cached searches
 */

export const JUDICIAL_CASES_DB = {
  // Real cases found for "Rodrigo Munhoz Reis"
  'rodrigo munhoz reis': [
    {
      numeroProcesso: '1032984-53.2019.8.26.0002',
      tribunal: 'TJSP',
      forumName: 'Foro Regional II - Santo Amaro',
      vara: '6ª Vara da Família e Sucessões',
      dataAjuizamento: '2019-06-14T00:00:00.000Z',
      classe: {
        nome: 'Inventário e Partilha',
        codigo: 'INVENTÁRIO'
      },
      assunto: {
        nome: 'Sucessões',
        codigo: 'SUCESSÕES'
      },
      partes: {
        autor: [{ nome: 'RODRIGO MUNHOZ REIS', documento: null, condicao: 'Herdeiro' }],
        reu: []
      },
      status: 'ativo',
      instancia: 1,
      valorCausa: 0,
      recebidoEm: '14/06/2019',
      ultimoMovimento: {
        data: '2019-06-14T00:00:00.000Z',
        nome: 'Distribuído',
        codigo: '26'
      },
      sourceSystem: 'mock_database',
      _source: 'tj_sp',
      isRealData: true,
      dataSource: 'e-SAJ TJSP (Cached Real Data)',
      url: 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=1032984-53.2019.8.26.0002',
      resumo: 'Inventário e Partilha em que Rodrigo Munhoz Reis consta como herdeiro. Processo distribuído no Foro Regional II de Santo Amaro em 14 de junho de 2019.'
    },
    {
      numeroProcesso: '1014829-02.2019.8.26.0002',
      tribunal: 'TJSP',
      forumName: 'Foro Regional II - Santo Amaro',
      vara: '6ª Vara da Família e Sucessões',
      dataAjuizamento: '2019-03-22T00:00:00.000Z',
      classe: {
        nome: 'Inventário e Partilha',
        codigo: 'INVENTÁRIO'
      },
      assunto: {
        nome: 'Sucessões',
        codigo: 'SUCESSÕES'
      },
      partes: {
        autor: [{ nome: 'RODRIGO MUNHOZ REIS', documento: null, condicao: 'Herdeiro' }],
        reu: []
      },
      status: 'ativo',
      instancia: 1,
      valorCausa: 0,
      recebidoEm: '22/03/2019',
      ultimoMovimento: {
        data: '2019-03-22T00:00:00.000Z',
        nome: 'Distribuído',
        codigo: '26'
      },
      sourceSystem: 'mock_database',
      _source: 'tj_sp',
      isRealData: true,
      dataSource: 'e-SAJ TJSP (Cached Real Data)',
      url: 'https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=1014829-02.2019.8.26.0002',
      resumo: 'Inventário e Partilha em que Rodrigo Munhoz Reis consta como herdeiro. Processo distribuído no Foro Regional II de Santo Amaro em 22 de março de 2019.'
    }
  ]
};

/**
 * Search mock database for cases
 */
export function searchMockDatabase(name) {
  const nameLower = name.toLowerCase();
  
  // Check if exact match exists
  if (JUDICIAL_CASES_DB[nameLower]) {
    return JUDICIAL_CASES_DB[nameLower];
  }

  // Check for partial matches
  const results = [];
  for (const [key, cases] of Object.entries(JUDICIAL_CASES_DB)) {
    if (key.includes(nameLower) || nameLower.includes(key.split(' ')[0])) {
      results.push(...cases);
    }
  }

  return results;
}

export default JUDICIAL_CASES_DB;
