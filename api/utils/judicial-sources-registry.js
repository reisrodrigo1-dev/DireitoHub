/**
 * Judicial Data Sources Registry
 * Manages multiple data sources for maximum information coverage
 */

import JusBrasilClient from './jusbrasil-client.js';
import TJSPClient from './tjsp-client.js';
import { retryWithBackoff } from './resilience.js';

// Wrapper class for DataJud functions
class DataJudWrapper {
  async fetchRecentCases(tribunalCode, batchSize) {
    // Import dynamically to avoid circular dependency
    const { fetchRecentCases } = await import('./datajud-client.js');
    return await fetchRecentCases(tribunalCode, batchSize);
  }

  async fetchCaseByNumber(tribunalCode, caseNumber) {
    const { fetchCaseByNumber } = await import('./datajud-client.js');
    return await fetchCaseByNumber(tribunalCode, caseNumber);
  }
}

// ============================================
// SOURCE REGISTRY - Add new sources here
// ============================================

export const DATA_SOURCES = {
  // Official CNJ API - Primary source
  datajud: {
    name: 'DataJud CNJ',
    client: DataJudWrapper,
    priority: 1, // Highest priority (most reliable)
    coverage: 'all_courts',
    rateLimit: { requests: 100, period: 60000 }, // 100 req/min
    enabled: true
  },

  // Direct tribunal access - High priority
  tj_sp: {
    name: 'Tribunal Justiça SP',
    client: TJSPClient,
    priority: 2,
    coverage: 'tj_sp',
    rateLimit: { requests: 10, period: 60000 },
    enabled: true  // ENABLED for maximum coverage
  },

  // Web scraping sources - Medium priority
  jusbrasil: {
    name: 'JusBrasil',
    client: JusBrasilClient,
    priority: 3,
    coverage: 'all_courts',
    rateLimit: { requests: 5, period: 60000 },
    enabled: true  // ENABLED for complementary data
  },

  stj: {
    name: 'Superior Tribunal Justiça',
    client: null, // TODO: implement
    priority: 1,
    coverage: 'stj',
    rateLimit: { requests: 20, period: 60000 },
    enabled: false
  },

  stf: {
    name: 'Supremo Tribunal Federal',
    client: null, // TODO: implement
    priority: 1,
    coverage: 'stf',
    rateLimit: { requests: 10, period: 60000 },
    enabled: false
  }
};

// ============================================
// SOURCE MANAGER - Orchestrates multiple sources
// ============================================

export class JudicialDataManager {
  constructor() {
    this.sources = {};
    this.activeSources = [];
    this.initializeSources();
  }

  initializeSources() {
    for (const [key, config] of Object.entries(DATA_SOURCES)) {
      if (config.enabled && config.client) {
        this.sources[key] = {
          ...config,
          instance: new config.client(),
          stats: {
            requests: 0,
            successes: 0,
            failures: 0,
            lastRequest: null
          }
        };
        this.activeSources.push(key);
      }
    }

    console.log(`📊 Initialized ${this.activeSources.length} judicial data sources:`, this.activeSources);
  }

  /**
   * Fetch data from all available sources for maximum coverage
   */
  async fetchFromAllSources(tribunalCode, options = {}) {
    const results = {
      tribunal: tribunalCode,
      sources: {},
      consolidated: [],
      metadata: {
        totalFetched: 0,
        totalUnique: 0,
        sourcesUsed: [],
        executionTime: Date.now()
      }
    };

    // Fetch from each source in parallel
    const fetchPromises = this.activeSources.map(async (sourceKey) => {
      const source = this.sources[sourceKey];
      try {
        console.log(`🔄 Fetching from ${source.name} for ${tribunalCode}...`);

        const sourceResults = await this.fetchFromSource(sourceKey, tribunalCode, options);

        results.sources[sourceKey] = {
          success: true,
          count: sourceResults.length,
          data: sourceResults,
          metadata: {
            source: source.name,
            priority: source.priority,
            fetchedAt: new Date().toISOString()
          }
        };

        results.metadata.sourcesUsed.push(sourceKey);
        results.metadata.totalFetched += sourceResults.length;

        return sourceResults;
      } catch (error) {
        console.error(`❌ Failed to fetch from ${source.name}:`, error.message);

        results.sources[sourceKey] = {
          success: false,
          error: error.message,
          count: 0,
          data: []
        };

        return [];
      }
    });

    const allResults = await Promise.all(fetchPromises);

    // Consolidate results from all sources
    results.consolidated = this.consolidateResults(allResults);
    results.metadata.totalUnique = results.consolidated.length;
    results.metadata.executionTime = Date.now() - results.metadata.executionTime;

    console.log(`✅ Consolidated ${results.metadata.totalFetched} cases from ${results.metadata.sourcesUsed.length} sources into ${results.metadata.totalUnique} unique cases`);

    return results;
  }

  /**
   * Fetch from a specific source with rate limiting
   */
  async fetchFromSource(sourceKey, tribunalCode, options) {
    const source = this.sources[sourceKey];
    if (!source) {
      throw new Error(`Source ${sourceKey} not found`);
    }

    // Rate limiting check
    if (this.checkRateLimit(source)) {
      throw new Error(`Rate limit exceeded for ${source.name}`);
    }

    // Update stats
    source.stats.requests++;
    source.stats.lastRequest = new Date();

    try {
      let results = [];

      if (sourceKey === 'datajud') {
        // DataJud specific logic
        results = await source.instance.fetchRecentCases(tribunalCode, options.batchSize || 100);
      } else if (sourceKey === 'tj_sp') {
        // TJSP direct access
        results = await source.instance.fetchCases(tribunalCode, options);
      } else if (sourceKey === 'jusbrasil') {
        // JusBrasil scraping
        results = await source.instance.fetchCases(tribunalCode, options);
      } else {
        // Generic source logic (for future implementations)
        results = await source.instance.fetchCases(tribunalCode, options);
      }

      source.stats.successes++;
      return results;

    } catch (error) {
      source.stats.failures++;
      throw error;
    }
  }

  /**
   * Check if source is within rate limits
   */
  checkRateLimit(source) {
    const now = Date.now();
    const timeWindow = source.rateLimit.period;

    // Simple rate limiting - could be enhanced
    if (source.stats.lastRequest &&
        (now - source.stats.lastRequest.getTime()) < (timeWindow / source.rateLimit.requests)) {
      return true; // Rate limited
    }

    return false; // OK to proceed
  }

  /**
   * Consolidate results from multiple sources
   * Removes duplicates and merges complementary data
   */
  consolidateResults(sourceResults) {
    const caseMap = new Map();
    const duplicates = [];

    for (const cases of sourceResults) {
      for (const caseData of cases) {
        const caseId = this.generateCaseId(caseData);

        if (caseMap.has(caseId)) {
          // Duplicate found - merge data
          const existing = caseMap.get(caseId);
          const merged = this.mergeCaseData(existing, caseData);
          caseMap.set(caseId, merged);
          duplicates.push(caseId);
        } else {
          // New case
          caseMap.set(caseId, {
            ...caseData,
            _sources: [caseData._source || 'unknown'],
            _merged: false
          });
        }
      }
    }

    const consolidated = Array.from(caseMap.values());

    console.log(`🔄 Consolidated: ${consolidated.length} unique cases, ${duplicates.length} duplicates merged`);

    return consolidated;
  }

  /**
   * Generate unique case ID for deduplication
   */
  generateCaseId(caseData) {
    // Use numeroProcesso as primary key, fallback to other identifiers
    return caseData.numeroProcesso ||
           caseData.numero ||
           `${caseData.tribunal}-${caseData.numeroUnico}`;
  }

  /**
   * Merge data from duplicate cases
   */
  mergeCaseData(existing, newData) {
    const merged = { ...existing };

    // Add source to sources list
    if (!merged._sources.includes(newData._source || 'unknown')) {
      merged._sources.push(newData._source || 'unknown');
    }

    // Merge complementary data (prefer non-null values)
    Object.keys(newData).forEach(key => {
      if (merged[key] == null && newData[key] != null) {
        merged[key] = newData[key];
      }
    });

    merged._merged = true;
    merged._lastUpdated = new Date().toISOString();

    return merged;
  }

  /**
   * Get statistics for all sources
   */
  getStats() {
    const stats = {
      totalSources: Object.keys(DATA_SOURCES).length,
      activeSources: this.activeSources.length,
      sourceStats: {}
    };

    for (const [key, source] of Object.entries(this.sources)) {
      stats.sourceStats[key] = {
        name: source.name,
        enabled: source.enabled,
        priority: source.priority,
        stats: source.stats
      };
    }

    return stats;
  }

  /**
   * Enable/disable sources dynamically
   */
  setSourceEnabled(sourceKey, enabled) {
    if (DATA_SOURCES[sourceKey]) {
      DATA_SOURCES[sourceKey].enabled = enabled;
      this.initializeSources(); // Reinitialize
      console.log(`${enabled ? '✅ Enabled' : '❌ Disabled'} source: ${sourceKey}`);
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const judicialDataManager = new JudicialDataManager();