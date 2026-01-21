#!/usr/bin/env node

/**
 * Real Judicial Search Test - PUPPETEER ONLY
 * No mocks, no fakes, no simulations
 * Pure real browser automation
 */

import { realSearch } from './api/utils/real-judicial-search.js';

const testName = process.argv[2] || 'rodrigo munhoz reis';

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  REAL JUDICIAL SEARCH - PUPPETEER ONLY                     ║
║                     Zero Mocks | Zero Simulations                          ║
║                         LIVE e-SAJ Browser Search                          ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

console.log(`🔍 Searching for: "${testName}"\n`);

// Check if Puppeteer is installed
try {
  await import('puppeteer');
  console.log('✅ Puppeteer is installed\n');
} catch (error) {
  console.error(`
❌ PUPPETEER NOT INSTALLED

To use this real search, install Puppeteer:

  npm install puppeteer

After installation, run again:
  
  node test-real-search.js "rodrigo munhoz reis"

Puppeteer will:
- Launch a real Chrome browser
- Navigate to e-SAJ TJSP
- Perform actual search
- Extract real judicial data
- No simulations, no mocks, no fake data

  `);
  process.exit(1);
}

try {
  const results = await realSearch.searchByNameReal(testName, {
    maxPages: 2
  });

  console.log('\n📊 RESULT SUMMARY:');
  console.log(`Search ID: ${results.searchId}`);
  console.log(`Query: "${results.query}"`);
  console.log(`Total Cases: ${results.metadata.totalFound}`);
  console.log(`Execution Time: ${results.metadata.executionTime}ms`);
  console.log(`Method: ${results.metadata.method}`);
  console.log(`Source: ${results.metadata.source}`);
  console.log(`Status: ${results.status}`);

  if (results.results.length > 0) {
    console.log(`\n✅ FOUND ${results.results.length} REAL CASES:\n`);
    results.results.forEach((c, i) => {
      console.log(`${i + 1}. ${c.numeroProcesso}`);
      console.log(`   Class: ${c.classe?.nome}`);
      console.log(`   Subject: ${c.assunto?.nome}`);
    });
  }

  // Show history
  console.log('\n\n📚 SEARCH HISTORY:');
  const history = realSearch.getHistory(5);
  if (history.length > 0) {
    history.forEach((h, i) => {
      console.log(`${i + 1}. "${h.query}" - ${h.casesFound} cases (${h.executionTime}ms)`);
    });
  } else {
    console.log('No previous searches');
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
