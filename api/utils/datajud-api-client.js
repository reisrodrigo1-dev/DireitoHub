/**
 * DataJud API Client - CNJ Official API
 * Official Brazilian judicial data from Conselho Nacional de Justiça
 * No authentication required for public search
 */

import fetch from 'node-fetch';

const DATAJUD_BASE_URL = 'https://www.cnj.jus.br/programas-e-acoes/numeracao-unica/consulta-processual-api';
const DATAJUD_SEARCH_URL = 'https://www-api.cnj.jus.br/api/judicial/processual/v0/listarprocessos';

export class DataJudAPIClient {
  constructor() {
    this.name = 'DataJud CNJ';
    this.baseDelay = 500;
  }

  /**
   * Search cases by name using DataJud API
   * This is the OFFICIAL CNJ API for judicial search
   */
  async searchByName(name, options = {}) {
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    console.log(`📋 DataJud API: Searching for "${name}"`);

    const results = [];
    const maxPages = options.maxPages || 3;

    try {
      for (let page = 0; page < maxPages; page++) {
        try {
          const pageResults = await this.searchPage(name, page, options);
          
          if (!pageResults || pageResults.length === 0) {
            break;
          }
          
          results.push(...pageResults);
          
          // Respectful delay
          await this.delay(this.baseDelay);
        } catch (error) {
          console.warn(`⚠️ DataJud page ${page} error: ${error.message}`);
          // Continue to next page
        }
      }

      console.log(`✅ DataJud: Found ${results.length} cases`);
      return results;

    } catch (error) {
      console.error(`❌ DataJud search error:`, error.message);
      return [];
    }
  }

  /**
   * Search a specific page
   */
  async searchPage(name, page, options) {
    try {
      // DataJud API parameters
      const params = new URLSearchParams();
      params.append('nome', name.trim());
      params.append('pagina', page.toString());
      params.append('limite', '10');

      const url = `${DATAJUD_SEARCH_URL}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        },
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || !data.processos) {
        return [];
      }

      return this.parseDataJudResults(data.processos, name);

    } catch (error) {
      console.error(`Error searching page ${page}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse DataJud API response
   */
  parseDataJudResults(processes, searchName) {
    const cases = [];

    try {
      for (const processo of processes) {
        try {
          const caseInfo = {
            numeroProcesso: processo.numero || processo.numeroProcesso,
            tribunal: this.extractTribunal(processo.numero),
            forumName: processo.foro || processo.localidade,
            dataAjuizamento: processo.dataAjuizamento || new Date().toISOString(),
            classe: {
              nome: processo.classe || 'Desconhecida',
              codigo: processo.classeId || 'AUTO'
            },
            assunto: {
              nome: processo.assunto || 'Desconhecido',
              codigo: processo.assuntoId || 'AUTO'
            },
            partes: {
              autor: this.parsePartes(processo.parteAutora || processo.autor),
              reu: this.parsePartes(processo.parteRe || processo.reu)
            },
            status: processo.status || 'ativo',
            instancia: processo.instancia || 1,
            valor: processo.valor || 0,
            sourceSystem: 'datajud_api',
            _source: 'datajud',
            isRealData: true,
            dataSource: 'DataJud CNJ',
            url: `https://www.cnj.jus.br/programas-e-acoes/numeracao-unica/consulta-processual/${processo.numero}`
          };

          cases.push(caseInfo);
        } catch (error) {
          console.error('Error parsing case:', error.message);
        }
      }

      return cases;

    } catch (error) {
      console.error('Error parsing results:', error.message);
      return [];
    }
  }

  /**
   * Extract tribunal code from case number
   */
  extractTribunal(caseNumber) {
    // Format: NNNNNNN-DD.AAAA.J.TT.OOOO
    if (!caseNumber) return 'UNKNOWN';
    
    const parts = caseNumber.split('.');
    if (parts.length >= 4) {
      const tt = parts[3];
      const tribunalMap = {
        '01': 'STF',
        '02': 'STJ',
        '03': 'TST',
        '04': 'TRF',
        '05': 'TJDFT',
        '06': 'TJAC',
        '07': 'TJAL',
        '08': 'TJAP',
        '09': 'TJAM',
        '10': 'TJBA',
        '11': 'TJCE',
        '12': 'TJDF',
        '13': 'TJES',
        '14': 'TJGO',
        '15': 'TJMA',
        '16': 'TJMT',
        '17': 'TJMS',
        '18': 'TJMG',
        '19': 'TJPA',
        '20': 'TJPB',
        '21': 'TJPR',
        '22': 'TJPE',
        '23': 'TJPI',
        '24': 'TJRJ',
        '25': 'TJRN',
        '26': 'TJSP',
        '27': 'TJRS',
        '28': 'TJRO',
        '29': 'TJRR',
        '30': 'TJSC',
        '31': 'TJSE',
        '32': 'TJTO'
      };
      return tribunalMap[tt] || `TJ${tt}`;
    }
    return 'UNKNOWN';
  }

  /**
   * Parse parties
   */
  parsePartes(parteData) {
    if (!parteData) return [];
    
    if (Array.isArray(parteData)) {
      return parteData.map(p => ({
        nome: typeof p === 'string' ? p : (p.nome || p.name || ''),
        documento: p.documento || p.cpf || p.cnpj || null
      }));
    }
    
    if (typeof parteData === 'string') {
      return [{ nome: parteData, documento: null }];
    }
    
    return [{ nome: parteData.nome || '', documento: parteData.documento || null }];
  }

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default DataJudAPIClient;
