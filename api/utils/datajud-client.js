/**
 * DataJud API Client - handles authentication and queries
 */

import fetch from 'node-fetch';
import { retryWithBackoff } from './resilience.js';

const DATAJUD_API_KEY = process.env.DATAJUD_API_KEY;

const TRIBUNAL_ENDPOINTS = {
  'TJSP': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsp/_search',
  'TJRJ': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search',
  'TJMG': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmg/_search',
  'TJRS': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrs/_search',
  'TJPR': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search',
  'TJSC': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjsc/_search',
  'TJBA': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjba/_search',
  'TJPE': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpe/_search',
  'TJCE': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjce/_search',
  'TJPA': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjpa/_search',
  'TJGO': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjgo/_search',
  'TJMT': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjmt/_search',
  'TJMS': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjms/_search',
  'TJDFT': 'https://api-publica.datajud.cnj.jus.br/api_publica_tjdft/_search'
};

/**
 * Fetch recent cases from DataJud
 * Only queries last 24 hours to optimize quota
 */
async function fetchRecentCases(tribunalCode, batchSize = 100) {
  return retryWithBackoff(async () => {
    const endpoint = TRIBUNAL_ENDPOINTS[tribunalCode];
    if (!endpoint) {
      throw new Error(`Unknown tribunal: ${tribunalCode}`);
    }
    
    // Query: Modified in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const query = {
      query: {
        bool: {
          must: [
            {
              range: {
                dataHoraUltimaAtualizacao: {
                  gte: yesterday.toISOString(),
                  lte: new Date().toISOString()
                }
              }
            }
          ]
        }
      },
      size: batchSize,
      _source: [
        'numeroProcesso',
        'classe',
        'assunto',
        'assuntos',
        'dataAjuizamento',
        'dataHoraUltimaAtualizacao',
        'dataUltimaAtualizacao',
        'partes',
        'orgaoJulgador',
        'movimentos',
        'valorCausa',
        'grau'
      ]
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `APIKey ${DATAJUD_API_KEY}`,
        'User-Agent': 'DireitoHub-JudicialSync/1.0'
      },
      body: JSON.stringify(query),
      timeout: 30000 // 30 second timeout
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DataJud API returned ${response.status}: ${text.substring(0, 200)}`);
    }
    
    const data = await response.json();
    const results = (data.hits?.hits || []).map(h => h._source);
    
    console.log(`📥 Fetched ${results.length} cases from ${tribunalCode}`);
    return results;
    
  }, `Fetch recent cases from ${tribunalCode}`);
}

/**
 * Fetch cases by process number
 */
async function fetchCaseByNumber(tribunalCode, caseNumber) {
  return retryWithBackoff(async () => {
    const endpoint = TRIBUNAL_ENDPOINTS[tribunalCode];
    if (!endpoint) {
      throw new Error(`Unknown tribunal: ${tribunalCode}`);
    }
    
    const query = {
      query: {
        match: {
          numeroProcesso: caseNumber
        }
      },
      size: 1,
      _source: [
        'numeroProcesso',
        'classe',
        'assunto',
        'assuntos',
        'dataAjuizamento',
        'dataHoraUltimaAtualizacao',
        'partes',
        'orgaoJulgador',
        'movimentos',
        'valorCausa',
        'grau'
      ]
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `APIKey ${DATAJUD_API_KEY}`,
        'User-Agent': 'DireitoHub-JudicialSync/1.0'
      },
      body: JSON.stringify(query),
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`DataJud API returned ${response.status}`);
    }
    
    const data = await response.json();
    return (data.hits?.hits || []).map(h => h._source);
    
  }, `Fetch case ${caseNumber} from ${tribunalCode}`);
}

export { fetchRecentCases, fetchCaseByNumber, TRIBUNAL_ENDPOINTS };
