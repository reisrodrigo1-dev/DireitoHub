/**
 * Quota monitoring - tracks Firestore usage against free tier limits
 */

import admin from 'firebase-admin';

const FREE_TIER_READS = 50000;
const FREE_TIER_WRITES = 20000;
const FREE_TIER_DELETES = 20000;
const SAFETY_THRESHOLD = 0.8; // Stop at 80% usage

/**
 * Check remaining Firestore quota before sync
 */
async function checkQuota(db) {
  try {
    // Query today's log entry
    const today = new Date().toISOString().split('T')[0];
    const logDoc = await db.collection('sync_logs').doc(today).get();
    
    if (!logDoc.exists) {
      // Fresh day, quota available
      return {
        status: 'HEALTHY',
        readsUsed: 0,
        writesUsed: 0,
        readsRemaining: FREE_TIER_READS,
        writesRemaining: FREE_TIER_WRITES,
        readsPercent: 0,
        writesPercent: 0
      };
    }
    
    const data = logDoc.data();
    
    // Aggregate all syncs for the day
    let totalWrites = 0;
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && value.success !== undefined) {
        totalWrites += (value.success || 0) + (value.updated || 0);
      }
    });
    
    const writesRemaining = FREE_TIER_WRITES - totalWrites;
    const writesPercent = (totalWrites / FREE_TIER_WRITES) * 100;
    
    let status = 'HEALTHY';
    
    if (writesPercent > SAFETY_THRESHOLD * 100) {
      status = 'WARNING';
    }
    
    if (writesRemaining <= 0) {
      status = 'EXCEEDED';
    }
    
    return {
      status,
      readsUsed: 0,
      writesUsed: totalWrites,
      readsRemaining: FREE_TIER_READS,
      writesRemaining,
      readsPercent: 0,
      writesPercent: Math.round(writesPercent)
    };
    
  } catch (error) {
    console.error('❌ Error checking quota:', error.message);
    return { 
      status: 'ERROR', 
      error: error.message,
      writesPercent: 50 // Assume safe default
    };
  }
}

/**
 * Record sync log for audit trail
 */
async function recordLogEntry(db, logEntry) {
  try {
    const docId = logEntry.logDate; // One doc per day
    
    const updateData = {};
    updateData[logEntry.tribunal] = {
      success: logEntry.status === 'success' ? logEntry.totalWritten : 0,
      failed: logEntry.errors?.length || 0,
      updated: logEntry.skipped || 0,
      lastRun: admin.firestore.Timestamp.now(),
      totalFetched: logEntry.totalFetched || 0
    };
    
    await db.collection('sync_logs').doc(docId).set(updateData, { merge: true });
    
    console.log(`✅ Log entry recorded for ${logEntry.tribunal}`);
  } catch (error) {
    console.error('❌ Failed to record log entry:', error.message);
  }
}

export { checkQuota, recordLogEntry, FREE_TIER_READS, FREE_TIER_WRITES, FREE_TIER_DELETES };
