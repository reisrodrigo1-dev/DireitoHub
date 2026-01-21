/**
 * STJ Judicial Search API Client
 * Superior Tribunal de Justiça (STJ) public API
 * Official source for second-level appeals and special cases
 */

import fetch from 'node-fetch';

const STJ_API_URL = 'https://www.stj.jus.br/webstj/processo/jurisprudencia/listarprocessos';

export class STJSearchClient {
  constructor() {
    this.name = 'STJ';
    this.baseDelay = 500;
  }

  /**
   * Search cases by name in STJ
   */
  async searchByName(name, options = {}) {
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    console.log(`📜 STJ Search: Looking for "${name}"`);

    const results = [];
    const maxPages = options.maxPages || 2;

    try {
      for (let page = 1; page <= maxPages; page++) {
        try {
          const pageResults = await this.searchPage(name, page, options);
          
          if (!pageResults || pageResults.length === 0) {
            break;
          }
          
          results.push(...pageResults);
          
          // Respectful delay
          await this.delay(this.baseDelay);
        } catch (error) {
          console.warn(`⚠️ STJ page ${page} error: ${error.message}`);
        }
      }

      console.log(`✅ STJ: Found ${results.length} cases`);
      return results;

    } catch (error) {
      console.error(`❌ STJ search error:`, error.message);
      return [];
    }
  }

  /**
   * Search a specific page
   */
  async searchPage(name, page, options) {
    try {
      const params = new URLSearchParams();
      params.append('term', name.trim());
      params.append('page', (page - 1).toString());
      params.append('size', '10');
      params.append('sort', 'date,desc');

      const url = `${STJ_API_URL}?${params.toString()}`;

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
        if (response.status === 404) {
          return []; // No results, not an error
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.content) {
        return [];
      }

      return this.parseSTJResults(data.content, name);

    } catch (error) {
      console.error(`Error searching page ${page}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse STJ API response
   */
  parseSTJResults(processes, searchName) {
    const cases = [];

    try {
      for (const processo of processes) {
        try {
          const caseInfo = {
            numeroProcesso: processo.processNumber || processo.numero,
            tribunal: 'STJ',
            forumName: 'Superior Tribunal de Justiça',
            dataAjuizamento: processo.dateOpen || processo.dataAjuizamento || new Date().toISOString(),
            classe: {
              nome: processo.processType || 'Recurso Especial',
              codigo: processo.processTypeCode || 'AUTO'
            },
            assunto: {
              nome: processo.subject || 'Desconhecido',
              codigo: processo.subjectCode || 'AUTO'
            },
            partes: {
              autor: this.parsePartes(processo.plaintiff || processo.parte),
              reu: this.parsePartes(processo.defendant || processo.contraparte)
            },
            status: 'ativo',
            instancia: 2,
            tribunal: 'STJ',
            sourceSystem: 'stj_api',
            _source: 'stj',
            isRealData: true,
            dataSource: 'STJ API',
            url: `https://www.stj.jus.br/webstj/processo/jurisprudencia/${processo.id || processo.numeroProcesso}`
          };

          cases.push(caseInfo);
        } catch (error) {
          console.error('Error parsing STJ case:', error.message);
        }
      }

      return cases;

    } catch (error) {
      console.error('Error parsing STJ results:', error.message);
      return [];
    }
  }

  /**
   * Parse parties
   */
  parsePartes(parteData) {
    if (!parteData) return [];
    
    if (Array.isArray(parteData)) {
      return parteData.map(p => ({
        nome: typeof p === 'string' ? p : (p.nome || p.name || ''),
        documento: p.documento || p.cpf || null
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

export default STJSearchClient;
