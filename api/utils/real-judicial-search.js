/**
 * Real Judicial Search - Puppeteer Only
 * ZERO mocks, ZERO simulations
 * Only real browser automation with Puppeteer
 */

import PuppeteerESAJScraper from './puppeteer-esaj-scraper.js';

export class RealJudicialSearch {
  constructor() {
    this.puppeteer = new PuppeteerESAJScraper();
    this.searchHistory = [];
  }

  /**
   * REAL search - Puppeteer only
   * No mocks, no fake data, no simulations
   */
  async searchByNameReal(name, options = {}) {
    const searchId = `real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 REAL JUDICIAL SEARCH: "${name}"`);
    console.log(`📊 Method: Puppeteer Browser Automation`);
    console.log(`${'='.repeat(80)}\n`);

    const result = {
      searchId,
      query: name.trim(),
      timestamp: new Date().toISOString(),
      metadata: {
        executionTime: 0,
        totalFound: 0,
        method: 'PUPPETEER_REAL',
        source: 'e-SAJ TJSP (Real Browser)',
        note: 'Zero mocks - only real data from live e-SAJ searches'
      },
      results: [],
      status: 'REAL'
    };

    try {
      // Perform real search
      console.log('🌐 Starting real browser search...\n');
      const cases = await this.puppeteer.searchByName(name, options);

      result.results = cases;
      result.metadata.totalFound = cases.length;
      result.metadata.executionTime = Date.now() - startTime;

      // Add to history
      this.searchHistory.push({
        id: searchId,
        query: name,
        timestamp: result.timestamp,
        casesFound: cases.length,
        executionTime: result.metadata.executionTime
      });

      // Print summary
      this.printSummary(result);

      return result;

    } catch (error) {
      console.error(`\n❌ Search error: ${error.message}`);
      result.metadata.executionTime = Date.now() - startTime;
      result.error = error.message;
      throw error;
    }
  }

  /**
   * Print search results
   */
  printSummary(result) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📋 SEARCH RESULTS`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`Query: "${result.query}"`);
    console.log(`Execution Time: ${result.metadata.executionTime}ms`);
    console.log(`Cases Found: ${result.metadata.totalFound}`);
    console.log(`Source: ${result.metadata.source}\n`);

    if (result.results.length > 0) {
      console.log(`✅ FOUND ${result.results.length} CASES:\n`);
      
      result.results.forEach((c, i) => {
        console.log(`${i + 1}. PROCESS NUMBER: ${c.numeroProcesso}`);
        console.log(`   Tribunal: ${c.tribunal}`);
        console.log(`   Class: ${c.classe?.nome || 'Unknown'}`);
        console.log(`   Subject: ${c.assunto?.nome || 'Unknown'}`);
        console.log(`   Date: ${new Date(c.dataAjuizamento).toLocaleDateString('pt-BR')}`);
        console.log(`   Status: ${c.status}`);
        console.log(`   URL: ${c.url}`);
        console.log();
      });
    } else {
      console.log(`📭 NO CASES FOUND\n`);
    }

    console.log(`${'─'.repeat(80)}\n`);
  }

  /**
   * Get search history
   */
  getHistory(limit = 10) {
    return this.searchHistory.slice(-limit);
  }
}

export const realSearch = new RealJudicialSearch();
export default RealJudicialSearch;
