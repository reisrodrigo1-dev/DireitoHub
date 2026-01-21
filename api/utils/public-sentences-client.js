/**
 * Public Judicial Sentences API Client
 * Multiple public sources for judicial decisions and sentences
 * Aggregates data from publicly available judicial databases
 */

import fetch from 'node-fetch';

const PUBLIC_SENTENCES_SOURCES = [
  'https://www.conjur.com.br/api/search',
  'https://www.migalhas.com.br/api/jurisprudencia',
  'https://consultor.com.br/api/sentencas'
];

export class PublicSentencesClient {
  constructor() {
    this.name = 'Public Sentences';
    this.baseDelay = 600;
  }

  /**
   * Search cases in public sentence databases
   */
  async searchByName(name, options = {}) {
    if (!name || name.trim().length < 3) {
      throw new Error('Nome deve ter pelo menos 3 caracteres.');
    }

    console.log(`📑 Public Sentences: Searching for "${name}"`);

    const results = [];

    try {
      // Search multiple public sources in parallel
      const promises = PUBLIC_SENTENCES_SOURCES.map((source, index) =>
        this.searchSource(name, source, index, options).catch(error => {
          console.warn(`⚠️ Source ${index} error: ${error.message}`);
          return [];
        })
      );

      const allResults = await Promise.all(promises);
      
      for (const sourceResults of allResults) {
        results.push(...sourceResults);
      }

      // Remove duplicates
      const uniqueResults = this.removeDuplicates(results);

      console.log(`✅ Public Sentences: Found ${uniqueResults.length} cases`);
      return uniqueResults;

    } catch (error) {
      console.error(`❌ Public Sentences error:`, error.message);
      return [];
    }
  }

  /**
   * Search a specific source
   */
  async searchSource(name, source, sourceIndex, options) {
    try {
      console.log(`🔄 Searching source ${sourceIndex + 1}...`);

      const params = new URLSearchParams();
      params.append('q', name.trim());
      params.append('limit', '10');

      const url = `${source}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        },
        timeout: 15000
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 400) {
          return []; // No results, not an error
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return this.parsePublicResults(data, name, sourceIndex);

    } catch (error) {
      console.error(`Source ${sourceIndex} error:`, error.message);
      return [];
    }
  }

  /**
   * Parse results from public sources
   */
  parsePublicResults(data, searchName, sourceIndex) {
    const cases = [];

    try {
      if (!data) return cases;

      // Handle different response formats
      const items = data.results || data.content || data.cases || [];

      for (const item of items) {
        try {
          const caseInfo = {
            numeroProcesso: item.processNumber || item.numero || item.id || `PUB-${sourceIndex}-${Date.now()}`,
            tribunal: item.tribunal || this.extractTribunalFromText(item.text || ''),
            forumName: item.forum || item.court || item.foro || 'Tribunal Público',
            dataAjuizamento: item.date || item.dataAjuizamento || new Date().toISOString(),
            classe: {
              nome: item.processType || item.classe || 'Sentença',
              codigo: 'AUTO'
            },
            assunto: {
              nome: item.subject || item.assunto || this.extractSubjectFromText(item.text || ''),
              codigo: 'AUTO'
            },
            partes: {
              autor: this.parsePartes(item.plaintiff || item.autor),
              reu: this.parsePartes(item.defendant || item.reu)
            },
            status: 'ativo',
            instancia: item.instancia || 1,
            sourceSystem: 'public_sentences_api',
            _source: 'public_sentences',
            isRealData: true,
            dataSource: `Public Sentences (Source ${sourceIndex + 1})`,
            url: item.url || item.link || '#',
            summary: item.summary || item.ementa || item.description || ''
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
   * Extract tribunal from text
   */
  extractTribunalFromText(text) {
    const tribunals = ['TJSP', 'TJRJ', 'TJMG', 'TJBA', 'STJ', 'STF', 'TST'];
    for (const tribunal of tribunals) {
      if (text.includes(tribunal)) {
        return tribunal;
      }
    }
    return 'Tribunal Público';
  }

  /**
   * Extract subject from text
   */
  extractSubjectFromText(text) {
    if (text.match(/cobrança|dívida/i)) return 'Cobrança';
    if (text.match(/família|sucessões/i)) return 'Direito de Família';
    if (text.match(/indenização/i)) return 'Indenização';
    if (text.match(/contrato/i)) return 'Contrato';
    return 'Desconhecido';
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
   * Remove duplicate cases
   */
  removeDuplicates(cases) {
    const seen = new Set();
    return cases.filter(c => {
      const key = c.numeroProcesso;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default PublicSentencesClient;
