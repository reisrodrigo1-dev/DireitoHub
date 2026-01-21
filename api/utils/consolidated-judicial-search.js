/**
 * Consolidated Judicial Search
 * Searches all sources simultaneously and consolidates results
 * Sources: DataJud API + STJ API + Public Sentences + Puppeteer + Cache
 */

import DataJudAPIClient from './datajud-api-client.js';
import STJSearchClient from './stj-search-client.js';
import PublicSentencesClient from './public-sentences-client.js';
import PuppeteerSearchClient from './puppeteer-search-client.js';
import { judicialSearchCache } from './judicial-search-cache.js';

export class ConsolidatedJudicialSearch {
  constructor() {
    this.dataJud = new DataJudAPIClient();
    this.stj = new STJSearchClient();
    this.publicSentences = new PublicSentencesClient();
    this.puppeteer = new PuppeteerSearchClient();
    this.cache = judicialSearchCache;
    this.searchHistory = [];
  }

  /**
   * MAIN METHOD: Search all sources simultaneously
   * Consolidates and deduplicates results
   * Uses cache for faster results
   */
  async searchByNameConsolidated(name, options = {}) {
    const searchId = `consolidated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 CONSOLIDATED JUDICIAL SEARCH FOR: "${name}"`);
    console.log(`${'='.repeat(80)}\n`);

    // Check cache first
    console.log('🔍 Checking cache...');
    const cachedResult = this.cache.getFromCache(name, 'all');
    
    if (cachedResult && cachedResult.length > 0) {
      console.log(`✅ Using cached results!\n`);
      return {
        searchId,
        query: name.trim(),
        timestamp: new Date().toISOString(),
        sources: {
          cache: { count: cachedResult.length, cases: cachedResult, error: null }
        },
        consolidated: {
          totalCases: cachedResult.length,
          uniqueCases: cachedResult,
          duplicatesFound: 0,
          conflictingInfo: [],
          fromCache: true
        },
        metadata: {
          executionTime: Date.now() - startTime,
          sourcesQueried: 1,
          sourcesSuccessful: 1,
          executionMode: 'CACHE',
          limitations: ['Resultados obtidos do cache local']
        }
      };
    }

    const results = {
      searchId,
      query: name.trim(),
      timestamp: new Date().toISOString(),
      sources: {
        datajud: { count: 0, cases: [], error: null },
        stj: { count: 0, cases: [], error: null },
        publicSentences: { count: 0, cases: [], error: null },
        puppeteer: { count: 0, cases: [], error: null }
      },
      consolidated: {
        totalCases: 0,
        uniqueCases: [],
        duplicatesFound: 0,
        conflictingInfo: []
      },
      metadata: {
        executionTime: 0,
        sourcesQueried: 4,
        sourcesSuccessful: 0,
        executionMode: 'PARALLEL',
        limitations: [
          'Consolidação de múltiplas fontes pode conter dados conflitantes',
          'Cada fonte tem diferentes critérios de indexação',
          'Alguns tribunais podem não estar disponíveis em todas as fontes'
        ]
      }
    };

    try {
      // Execute all searches in parallel for maximum speed
      console.log('⚙️  Starting parallel searches on all sources...\n');

      const searchPromises = [
        this.searchDataJud(name, options)
          .then(cases => ({ source: 'datajud', cases, error: null }))
          .catch(error => ({ source: 'datajud', cases: [], error: error.message })),
        
        this.searchSTJ(name, options)
          .then(cases => ({ source: 'stj', cases, error: null }))
          .catch(error => ({ source: 'stj', cases: [], error: error.message })),
        
        this.searchPublicSentences(name, options)
          .then(cases => ({ source: 'publicSentences', cases, error: null }))
          .catch(error => ({ source: 'publicSentences', cases: [], error: error.message })),
        
        this.searchPuppeteer(name, options)
          .then(cases => ({ source: 'puppeteer', cases, error: null }))
          .catch(error => ({ source: 'puppeteer', cases: [], error: error.message }))
      ];

      const searchResults = await Promise.all(searchPromises);

      // Process results from each source
      for (const result of searchResults) {
        const sourceName = result.source;
        
        if (result.error) {
          console.log(`⚠️  ${sourceName}: Error - ${result.error}`);
          results.sources[sourceName].error = result.error;
        } else {
          console.log(`✅ ${sourceName}: Found ${result.cases.length} cases`);
          results.sources[sourceName].cases = result.cases;
          results.sources[sourceName].count = result.cases.length;
          results.metadata.sourcesSuccessful++;
        }
      }

      console.log('\n' + '─'.repeat(80) + '\n');

      // Consolidate results
      const allCases = [];
      for (const source of Object.values(results.sources)) {
        allCases.push(...source.cases);
      }

      // Deduplicate and merge
      const consolidated = this.consolidateCases(allCases);

      results.consolidated.totalCases = allCases.length;
      results.consolidated.uniqueCases = consolidated.unique;
      results.consolidated.duplicatesFound = consolidated.duplicateCount;
      results.consolidated.conflictingInfo = consolidated.conflicts;

      results.metadata.executionTime = Date.now() - startTime;

      // Cache results if we found any
      if (consolidated.unique.length > 0) {
        this.cache.saveToCache(name, consolidated.unique, 'all');
      }

      // Add to history
      this.addToHistory(results);

      // Print summary
      this.printSummary(results);

      return results;

    } catch (error) {
      console.error('❌ Critical error in consolidated search:', error.message);
      results.metadata.executionTime = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Search DataJud API
   */
  async searchDataJud(name, options) {
    try {
      console.log('🟦 DataJud API: Querying...');
      const results = await this.dataJud.searchByName(name, options);
      return results || [];
    } catch (error) {
      console.error('DataJud error:', error.message);
      return [];
    }
  }

  /**
   * Search STJ API
   */
  async searchSTJ(name, options) {
    try {
      console.log('🟩 STJ API: Querying...');
      const results = await this.stj.searchByName(name, options);
      return results || [];
    } catch (error) {
      console.error('STJ error:', error.message);
      return [];
    }
  }

  /**
   * Search Public Sentences
   */
  async searchPublicSentences(name, options) {
    try {
      console.log('🟨 Public Sentences: Querying...');
      const results = await this.publicSentences.searchByName(name, options);
      return results || [];
    } catch (error) {
      console.error('Public Sentences error:', error.message);
      return [];
    }
  }

  /**
   * Search using Puppeteer
   */
  async searchPuppeteer(name, options) {
    try {
      console.log('🤖 Puppeteer Browser: Querying...');
      const results = await this.puppeteer.searchByName(name, options);
      return results || [];
    } catch (error) {
      console.error('Puppeteer error:', error.message);
      return [];
    }
  }

  /**
   * Consolidate cases from multiple sources
   * Removes duplicates and merges conflicting information
   */
  consolidateCases(allCases) {
    const caseMap = new Map();
    const conflicts = [];
    let duplicateCount = 0;

    for (const caseData of allCases) {
      const key = caseData.numeroProcesso;

      if (caseMap.has(key)) {
        // Duplicate found - merge information
        duplicateCount++;
        const existing = caseMap.get(key);
        
        // Check for conflicting information
        const conflict = this.findConflicts(existing, caseData);
        if (conflict.length > 0) {
          conflicts.push({
            numeroProcesso: key,
            conflicts: conflict
          });
        }

        // Merge: keep most complete information
        caseMap.set(key, this.mergeCaseData(existing, caseData));
      } else {
        // New case
        caseMap.set(key, caseData);
      }
    }

    return {
      unique: Array.from(caseMap.values()),
      duplicateCount,
      conflicts
    };
  }

  /**
   * Find conflicting information between two case records
   */
  findConflicts(case1, case2) {
    const conflicts = [];

    if (case1.classe?.nome !== case2.classe?.nome) {
      conflicts.push({
        field: 'classe',
        source1: case1._source,
        value1: case1.classe?.nome,
        source2: case2._source,
        value2: case2.classe?.nome
      });
    }

    if (case1.assunto?.nome !== case2.assunto?.nome) {
      conflicts.push({
        field: 'assunto',
        source1: case1._source,
        value1: case1.assunto?.nome,
        source2: case2._source,
        value2: case2.assunto?.nome
      });
    }

    const date1 = new Date(case1.dataAjuizamento).getTime();
    const date2 = new Date(case2.dataAjuizamento).getTime();
    if (Math.abs(date1 - date2) > 86400000) { // More than 1 day difference
      conflicts.push({
        field: 'dataAjuizamento',
        source1: case1._source,
        value1: case1.dataAjuizamento,
        source2: case2._source,
        value2: case2.dataAjuizamento
      });
    }

    return conflicts;
  }

  /**
   * Merge case data from multiple sources
   */
  mergeCaseData(case1, case2) {
    return {
      ...case1,
      sources: [case1._source, case2._source],
      dataQuality: 'CONSOLIDATED',
      allVersions: [case1, case2],
      // Prefer official source (datajud) for conflicting fields
      classe: case1._source === 'datajud' ? case1.classe : (case2._source === 'datajud' ? case2.classe : case1.classe),
      assunto: case1._source === 'datajud' ? case1.assunto : (case2._source === 'datajud' ? case2.assunto : case1.assunto),
      partes: this.mergePartes(case1.partes, case2.partes)
    };
  }

  /**
   * Merge parties information
   */
  mergePartes(partes1, partes2) {
    const merged = {
      autor: [...(partes1?.autor || [])],
      reu: [...(partes1?.reu || [])]
    };

    // Add from partes2 if not duplicate
    for (const autor of partes2?.autor || []) {
      if (!merged.autor.some(a => a.nome === autor.nome)) {
        merged.autor.push(autor);
      }
    }

    for (const reu of partes2?.reu || []) {
      if (!merged.reu.some(r => r.nome === reu.nome)) {
        merged.reu.push(reu);
      }
    }

    return merged;
  }

  /**
   * Print search summary
   */
  printSummary(results) {
    console.log('📊 CONSOLIDATED SEARCH RESULTS');
    console.log('─'.repeat(80));
    console.log(`Query: "${results.query}"`);
    console.log(`Search ID: ${results.searchId}`);
    console.log(`Execution Time: ${results.metadata.executionTime}ms\n`);

    console.log('📈 SOURCES BREAKDOWN:');
    for (const [source, data] of Object.entries(results.sources)) {
      const status = data.error ? '❌' : '✅';
      console.log(`  ${status} ${source}: ${data.count} cases` + (data.error ? ` (${data.error})` : ''));
    }

    console.log(`\n📋 CONSOLIDATION RESULTS:`);
    console.log(`  Total cases from all sources: ${results.consolidated.totalCases}`);
    console.log(`  Unique cases: ${results.consolidated.uniqueCases.length}`);
    console.log(`  Duplicates merged: ${results.consolidated.duplicatesFound}`);
    console.log(`  Data conflicts found: ${results.consolidated.conflictingInfo.length}`);

    if (results.consolidated.uniqueCases.length > 0) {
      console.log(`\n✅ FOUND ${results.consolidated.uniqueCases.length} UNIQUE CASES:`);
      results.consolidated.uniqueCases.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.numeroProcesso} (${c._source})`);
        console.log(`     Classe: ${c.classe?.nome}`);
        console.log(`     Assunto: ${c.assunto?.nome}`);
        console.log(`     Data: ${new Date(c.dataAjuizamento).toLocaleDateString('pt-BR')}`);
      });
    } else {
      console.log(`\n📭 No cases found matching "${results.query}"`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Add to search history
   */
  addToHistory(result) {
    this.searchHistory.push({
      id: result.searchId,
      query: result.query,
      timestamp: result.timestamp,
      totalFound: result.consolidated.uniqueCases.length,
      executionTime: result.metadata.executionTime
    });
  }

  /**
   * Get search history
   */
  getSearchHistory(limit = 10) {
    return this.searchHistory.slice(-limit);
  }
}

export const consolidatedSearch = new ConsolidatedJudicialSearch();
export default ConsolidatedJudicialSearch;
