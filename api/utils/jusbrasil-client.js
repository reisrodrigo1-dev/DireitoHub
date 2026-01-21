/**
 * JusBrasil Data Client
 * Scrapes judicial data from JusBrasil website
 * Note: This is a basic implementation - real scraping would need careful rate limiting
 */

import fetch from 'node-fetch';
import { retryWithBackoff } from './resilience.js';

const JUSBRASIL_BASE_URL = 'https://www.jusbrasil.com.br';
const JUSBRASIL_SEARCH_URL = 'https://www.jusbrasil.com.br/busca';

export class JusBrasilClient {
  constructor() {
    this.name = 'JusBrasil';
    this.baseDelay = 2000; // 2 seconds between requests (respectful scraping)
  }

  /**
   * Search for cases by tribunal
   */
  async fetchCases(tribunalCode, options = {}) {
    const results = [];
    const maxPages = options.maxPages || 3; // Limit pages to avoid overloading

    try {
      console.log(`🔍 Searching JusBrasil for tribunal: ${tribunalCode}`);

      // JusBrasil uses different tribunal codes
      const jusBrasilTribunal = this.mapTribunalCode(tribunalCode);
      if (!jusBrasilTribunal) {
        console.log(`⚠️ Tribunal ${tribunalCode} not supported by JusBrasil client`);
        return results;
      }

      for (let page = 1; page <= maxPages; page++) {
        const pageResults = await this.searchPage(jusBrasilTribunal, page, options);
        results.push(...pageResults);

        // Respectful delay between pages
        if (page < maxPages) {
          await this.delay(this.baseDelay * 2);
        }
      }

      console.log(`✅ JusBrasil: Found ${results.length} cases for ${tribunalCode}`);
      return results;

    } catch (error) {
      console.error(`❌ JusBrasil search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Search a specific page
   */
  async searchPage(tribunal, page, options) {
    const searchParams = new URLSearchParams({
      q: `tribunal:${tribunal}`,
      page: page.toString(),
      sort: 'relevance',
      'filter[court]': tribunal
    });

    const searchUrl = `${JUSBRASIL_SEARCH_URL}?${searchParams}`;

    const response = await retryWithBackoff(async () => {
      const res = await fetch(searchUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'max-age=0',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive'
          },
          timeout: 15000
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res;
    }, `JusBrasil search page ${page}`, 2);

    const html = await response.text();
    return this.parseSearchResults(html, tribunal);
  }

  /**
   * Parse HTML search results
   * Note: This is a simplified parser - real implementation would need proper HTML parsing
   */
  parseSearchResults(html, tribunal) {
    const results = [];

    try {
      // Extract case information using regex patterns
      // This is a basic implementation - real scraping would use cheerio or similar

      const casePatterns = [
        // Pattern for case numbers
        /processo[\s:]+([0-9\-\.]+)/gi,
        // Pattern for court information
        /(TJ[A-Z]{2}|TRF[0-9]|STJ|STF)/g,
        // Pattern for case titles
        /(?:autos|ação|recurso|agravo|apelação)[\s:]+([^<\n]+)/gi
      ];

      // Find case numbers
      const caseNumbers = [];
      let match;
      const numeroPattern = /([0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4})/g;

      while ((match = numeroPattern.exec(html)) !== null) {
        if (!caseNumbers.includes(match[1])) {
          caseNumbers.push(match[1]);
        }
      }

      // Create case objects from found numbers
      for (const numeroProcesso of caseNumbers.slice(0, 10)) { // Limit to 10 per page
        const caseData = {
          numeroProcesso,
          tribunal: tribunal,
          sourceSystem: 'jusbrasil',
          _source: 'jusbrasil',
          _rawData: true, // Mark as raw data needing normalization
          dataAjuizamento: null, // Would need to fetch individual case page
          classe: { nome: 'Não informado' },
          assunto: { nome: 'Não informado' },
          partes: { autor: [], reu: [] },
          status: 'ativo',
          instancia: 1,
          valorCausa: null,
          juiz: null,
          ultimoMovimento: {
            data: new Date().toISOString(),
            nome: 'Encontrado no JusBrasil',
            codigo: 'JUSBRASIL_SEARCH'
          },
          syncStatus: 'sincronizado',
          syncDate: new Date(),
          contentHash: null
        };

        results.push(caseData);
      }

    } catch (error) {
      console.error('Error parsing JusBrasil results:', error.message);
    }

    return results;
  }

  /**
   * Map our tribunal codes to JusBrasil codes
   */
  mapTribunalCode(ourCode) {
    const mapping = {
      'TJSP': 'tj-sp',
      'TJRJ': 'tj-rj',
      'TJMG': 'tj-mg',
      'TJRS': 'tj-rs',
      'TJPR': 'tj-pr',
      'TJSC': 'tj-sc',
      'TJBA': 'tj-ba',
      'TJPE': 'tj-pe',
      'TJCE': 'tj-ce',
      'TJPA': 'tj-pa',
      'TJGO': 'tj-go',
      'TJMT': 'tj-mt',
      'TJMS': 'tj-ms',
      'TJDFT': 'tj-dft',
      'TRF1': 'trf-1',
      'TRF2': 'trf-2',
      'TRF3': 'trf-3',
      'TRF4': 'trf-4',
      'TRF5': 'trf-5',
      'TRF6': 'trf-6',
      'STJ': 'stj',
      'STF': 'stf'
    };

    return mapping[ourCode] || null;
  }

  /**
   * Respectful delay between requests
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get detailed case information
   * Would fetch individual case page for full details
   */
  async fetchCaseByNumber(tribunalCode, caseNumber) {
    // This would implement fetching individual case details
    // For now, return basic structure
    console.log(`📄 JusBrasil: Would fetch details for ${caseNumber} from ${tribunalCode}`);

    return {
      numeroProcesso: caseNumber,
      tribunal: tribunalCode,
      sourceSystem: 'jusbrasil',
      _source: 'jusbrasil',
      // ... detailed case data would go here
    };
  }
}

export default JusBrasilClient;