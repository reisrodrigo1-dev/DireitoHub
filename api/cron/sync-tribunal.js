/**
 * Sync Tribunal - Main orchestrator for syncing cases from a single tribunal
 * Called from: GitHub Actions via cron
 * Runtime: ~2-5 minutes per tribunal
 */

import admin from 'firebase-admin';
import { normalizeProceso } from '../utils/normalize-judicial-data.js';
import { batchWriteIfChanged } from '../utils/deduplication.js';
import { judicialDataManager } from '../utils/judicial-sources-registry.js';
import { recordLogEntry } from '../monitoring/quota-tracker.js';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_ADMIN_DB_URL
  });
}

const db = admin.firestore();

/**
 * MAIN SYNC FUNCTION
 */
async function syncTribunal(tribunalCode) {
  const startTime = Date.now();
  const logEntry = {
    logDate: new Date().toISOString().split('T')[0],
    executionTime: new Date().toISOString(),
    tribunal: tribunalCode,
    status: 'pending',
    totalFetched: 0,
    totalProcessed: 0,
    totalWritten: 0,
    errors: []
  };
  
  try {
    console.log(`\n🏛️ Starting sync for tribunal: ${tribunalCode}`);
    
    // Step 1: Fetch from ALL available sources for maximum coverage
    const fetchResult = await judicialDataManager.fetchFromAllSources(tribunalCode, {
      batchSize: 100,
      maxPages: 2
    });

    logEntry.totalFetched = fetchResult.metadata.totalFetched;
    logEntry.sources = fetchResult.metadata.sourcesUsed;
    logEntry.sourceStats = fetchResult.sources;

    if (fetchResult.consolidated.length === 0) {
      console.log(`⚠️ No cases found for ${tribunalCode} from any source`);
      logEntry.status = 'no_data';
      await recordLogEntry(db, logEntry);
      return logEntry;
    }
    
    // Step 2: Normalize consolidated data from all sources
    const normalizedCases = [];
    for (const rawCase of fetchResult.consolidated) {
      try {
        const normalized = normalizeProceso(rawCase);
        normalizedCases.push(normalized);
      } catch (error) {
        console.warn(`⚠️ Failed to normalize case: ${error.message}`);
        logEntry.errors.push({
          processoId: rawCase.numeroProcesso,
          error: error.message,
          source: rawCase._source
        });
      }
    }
    
    logEntry.totalProcessed = normalizedCases.length;
    console.log(`✅ Normalized ${normalizedCases.length} cases`);
    
    // Step 3: Write only changed cases (deduplication)
    const writeResult = await batchWriteIfChanged(db, normalizedCases);
    logEntry.totalWritten = writeResult.writeCost;
    logEntry.skipped = writeResult.skipped;
    
    if (writeResult.failures.length > 0) {
      logEntry.errors.push(...writeResult.failures.slice(0, 10));
    }
    
    logEntry.status = 'success';
    
    console.log(`📊 Results for ${tribunalCode}:`);
    console.log(`   Sources used: ${logEntry.sources.join(', ')}`);
    console.log(`   Fetched: ${logEntry.totalFetched}`);
    console.log(`   Processed: ${logEntry.totalProcessed}`);
    console.log(`   Written: ${logEntry.totalWritten} (${writeResult.skipped} skipped)`);
    if (writeResult.skipped > 0) {
      console.log(`   Deduplication rate: ${Math.round((writeResult.skipped / (writeResult.skipped + writeResult.writeCost)) * 100)}%`);
    }
    
  } catch (error) {
    console.error(`❌ Sync failed for ${tribunalCode}:`, error.message);
    logEntry.status = 'error';
    logEntry.errors = [{ message: error.message, stack: error.stack }];
  } finally {
    // Record log entry
    await recordLogEntry(db, logEntry);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Sync complete for ${tribunalCode} in ${duration}s\n`);
    
    return logEntry;
  }
}

// CLI invocation: node api/cron/sync-tribunal.js TJSP
if (process.argv[2]) {
  syncTribunal(process.argv[2])
    .then(result => {
      console.log('\n📋 Final log entry:', result);
      process.exit(result.status === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { syncTribunal };
