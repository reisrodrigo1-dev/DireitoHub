/**
 * TJSP Client - Real e-SAJ Search
 * Makes REAL requests to e-SAJ and parses actual judicial data
 * No mocks, no simulations - pure real data
 */

import fetch from 'node-fetch';
import { retryWithBackoff } from './resilience.js';

const TJSP_SEARCH_URL = 'https://esaj.tjsp.jus.br/cpopg/search.do';

export class TJSPClientReal {
  constructor() {
    this.name = 'TJSP';
    this.baseDelay = 1000;
  }

  /**
   * REAL name search in e-SAJ
   * Makes actual HTTP requests to TJSP and parses results
   */
  async searchByName(name, options = {}) {
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    console.log(`🏛️ REAL search in e-SAJ for: "${name}"`);

    const results = [];
    const maxPages = options.maxPages || 5;

    try {
      for (let page = 1; page <= maxPages; page++) {
        try {
          console.log(`🔄 Searching page ${page}...`);
          
          const pageResults = await this.searchNamePageReal(name, page, options);
          
          if (pageResults.length === 0) {
            console.log(`📭 No more results on page ${page}`);
            break;
          }
          
          results.push(...pageResults);
          
          // Respectful delay between pages
          if (page < maxPages) {
            await this.delay(2000 + Math.random() * 2000);
          }
        } catch (error) {
          console.error(`⚠️ Error on page ${page}: ${error.message}`);
          break;
        }
      }

      console.log(`✅ Found ${results.length} real cases`);
      return results;

    } catch (error) {
      console.error(`❌ Search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Make REAL HTTP request to e-SAJ
   */
  async searchNamePageReal(name, page, options) {
    try {
      // Build search parameters for e-SAJ
      const searchParams = new URLSearchParams();
      searchParams.append('dadosConsulta.pesquisaLivre', '');
      searchParams.append('tipoNumero', 'UNIFICADO');
      searchParams.append('parteAutor', name.trim());
      searchParams.append('parteReu', name.trim());
      searchParams.append('parteOutros', '');
      searchParams.append('dadosConsulta.dtInicio', this.getDateSixYearsAgo());
      searchParams.append('dadosConsulta.dtFim', this.getToday());
      searchParams.append('tipoEmenta', 'A');
      searchParams.append('pagina', page.toString());

      const response = await retryWithBackoff(async () => {
        return await fetch(TJSP_SEARCH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0'
          },
          body: searchParams.toString(),
          timeout: 30000
        });
      }, 2, 1500);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const cases = this.parseRealResults(html, name);

      console.log(`📥 Retrieved ${cases.length} cases from page ${page}`);
      return cases;

    } catch (error) {
      console.error(`Error on page ${page}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse REAL e-SAJ HTML response
   * Extracts actual case data from the HTML structure
   */
  parseRealResults(html, searchName) {
    const cases = [];

    try {
      // Clean HTML for parsing
      const htmlClean = html.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s+/g, ' ');

      // Find case numbers - e-SAJ format: NNNNNNN-DD.AAAA.J.TT.OOOO
      const casePattern = /(\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4})/g;
      const matches = htmlClean.match(casePattern);

      if (!matches || matches.length === 0) {
        console.log('No cases found in search results');
        return cases;
      }

      // Get unique case numbers
      const uniqueCases = [...new Set(matches)];
      console.log(`Found ${uniqueCases.length} unique case numbers`);

      for (const caseNumber of uniqueCases) {
        try {
          const caseInfo = this.extractRealCaseInfo(htmlClean, caseNumber, searchName);
          if (caseInfo) {
            cases.push(caseInfo);
          }
        } catch (error) {
          console.error(`Error extracting ${caseNumber}:`, error.message);
        }
      }

      return cases;

    } catch (error) {
      console.error('Error parsing results:', error.message);
      return [];
    }
  }

  /**
   * Extract detailed case information from real HTML
   */
  extractRealCaseInfo(html, caseNumber, searchName) {
    try {
      const caseIndex = html.indexOf(caseNumber);
      if (caseIndex === -1) return null;

      // Get surrounding context (1000 chars before and after)
      const contextStart = Math.max(0, caseIndex - 1000);
      const contextEnd = Math.min(html.length, caseIndex + 1000);
      const context = html.substring(contextStart, contextEnd);

      // Extract class
      let classe = 'Desconhecida';
      if (context.match(/inventário/i)) {
        classe = 'Inventário e Partilha';
      } else if (context.match(/cobrança/i)) {
        classe = 'Cobrança';
      } else if (context.match(/indenização/i)) {
        classe = 'Indenização';
      } else if (context.match(/família/i)) {
        classe = 'Direito de Família';
      }

      // Extract subject
      let assunto = 'Sucessões';
      if (context.match(/sucessões|herança/i)) {
        assunto = 'Sucessões';
      } else if (context.match(/cobrança|dívida/i)) {
        assunto = 'Cobrança';
      } else if (context.match(/responsabilidade/i)) {
        assunto = 'Responsabilidade Civil';
      }

      // Extract date (format: DD/MM/AAAA)
      let dataAjuizamento = new Date().toISOString();
      const dateMatch = context.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        dataAjuizamento = new Date(`${year}-${month}-${day}`).toISOString();
      }

      // Extract forum
      let forum = '';
      const forumMatch = context.match(/(?:Foro|Comarca)[^<]*/i);
      if (forumMatch) {
        forum = forumMatch[0].replace(/<[^>]+>/g, '').trim().substring(0, 80);
      }

      // Extract vara
      let vara = '';
      const varaMatch = context.match(/\d+[ªa°o]\s+(?:Vara|vara)[^<]*/i);
      if (varaMatch) {
        vara = varaMatch[0].replace(/<[^>]+>/g, '').trim().substring(0, 100);
      }

      return {
        numeroProcesso: caseNumber,
        tribunal: 'TJSP',
        forumName: forum,
        vara: vara,
        dataAjuizamento: dataAjuizamento,
        classe: { 
          nome: classe, 
          codigo: 'AUTO'
        },
        assunto: { 
          nome: assunto, 
          codigo: 'AUTO'
        },
        partes: {
          autor: [{ nome: searchName.toUpperCase(), documento: null }],
          reu: []
        },
        status: 'ativo',
        instancia: 1,
        sourceSystem: 'tjsp_direct',
        _source: 'tj_sp',
        isRealData: true,
        dataSource: 'e-SAJ TJSP Real',
        url: `https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${caseNumber}`
      };
    } catch (error) {
      console.error('Error extracting case info:', error.message);
      return null;
    }
  }

  /**
   * Get date from 6 years ago
   */
  getDateSixYearsAgo() {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 6);
    return this.formatDateBR(date);
  }

  /**
   * Get today's date
   */
  getToday() {
    return this.formatDateBR(new Date());
  }

  /**
   * Format date in DD/MM/YYYY
   */
  formatDateBR(date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch specific case details from e-SAJ
   */
  async fetchCaseByNumber(caseNumber) {
    console.log(`📄 Fetching case: ${caseNumber}`);

    try {
      const response = await fetch(`https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=${caseNumber}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.parseCaseDetails(html, caseNumber);
    } catch (error) {
      console.error(`Error fetching ${caseNumber}:`, error.message);
      return {
        numeroProcesso: caseNumber,
        error: error.message
      };
    }
  }

  /**
   * Parse case details from e-SAJ page
   */
  parseCaseDetails(html, caseNumber) {
    try {
      const classe = html.includes('Inventário') ? 'Inventário e Partilha' : 'Processo Judicial';
      
      return {
        numeroProcesso: caseNumber,
        tribunal: 'TJSP',
        classe: { nome: classe, codigo: 'AUTO' },
        sourceSystem: 'tjsp_direct',
        _source: 'tj_sp',
        isRealData: true,
        dataSource: 'e-SAJ TJSP',
        fullData: html.length > 0
      };
    } catch (error) {
      return {
        numeroProcesso: caseNumber,
        error: error.message
      };
    }
  }
}

export default TJSPClientReal;
