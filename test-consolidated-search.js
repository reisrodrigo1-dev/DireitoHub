#!/usr/bin/env node

/**
 * Test Consolidated Judicial Search
 * Tests all 4 sources: DataJud + STJ + Public Sentences + Selenium
 */

import { consolidatedSearch } from './api/utils/consolidated-judicial-search.js';

const testName = process.argv[2] || 'rodrigo munhoz reis';

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                 CONSOLIDATED JUDICIAL SEARCH TEST                          ║
║            Testing: DataJud + STJ + Public Sentences + Selenium            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

console.log(`🔍 Searching for: "${testName}\n`);

try {
  const results = await consolidatedSearch.searchByNameConsolidated(testName, {
    maxPages: 2
  });

  console.log('📌 FINAL RESULT STRUCTURE:');
  console.log(`
  {
    searchId: "${results.searchId}",
    query: "${results.query}",
    timestamp: "${results.timestamp}",
    sources: {
      datajud: { count: ${results.sources.datajud.count}, error: ${results.sources.datajud.error ? '"' + results.sources.datajud.error + '"' : 'null'} },
      stj: { count: ${results.sources.stj.count}, error: ${results.sources.stj.error ? '"' + results.sources.stj.error + '"' : 'null'} },
      publicSentences: { count: ${results.sources.publicSentences.count}, error: ${results.sources.publicSentences.error ? '"' + results.sources.publicSentences.error + '"' : 'null'} },
      selenium: { count: ${results.sources.selenium.count}, error: ${results.sources.selenium.error ? '"' + results.sources.selenium.error + '"' : 'null'} }
    },
    consolidated: {
      totalCases: ${results.consolidated.totalCases},
      uniqueCases: ${results.consolidated.uniqueCases.length},
      duplicatesFound: ${results.consolidated.duplicatesFound}
    },
    metadata: {
      executionTime: ${results.metadata.executionTime}ms,
      sourcesQueried: ${results.metadata.sourcesQueried},
      sourcesSuccessful: ${results.metadata.sourcesSuccessful}
    }
  }
  `);

  // Show search history
  console.log('\n📚 SEARCH HISTORY:');
  const history = consolidatedSearch.getSearchHistory(5);
  history.forEach((h, i) => {
    console.log(`  ${i + 1}. ${new Date(h.timestamp).toLocaleString('pt-BR')} - "${h.query}" (${h.totalFound} results, ${h.executionTime}ms)`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
