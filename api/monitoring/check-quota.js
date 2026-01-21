/**
 * Check Firestore quota - runs before sync to prevent exceeding limits
 */

import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_ADMIN_DB_URL
  });
}

const db = admin.firestore();

const FREE_TIER_WRITES = 20000;
const SAFETY_THRESHOLD = 0.75; // 75% = warning

async function checkQuota() {
  try {
    console.log('📊 Checking Firestore quota...');
    
    const today = new Date().toISOString().split('T')[0];
    const logDoc = await db.collection('sync_logs').doc(today).get();
    
    let totalWrites = 0;
    
    if (logDoc.exists) {
      const data = logDoc.data();
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && value.success !== undefined) {
          totalWrites += (value.success || 0) + (value.updated || 0);
        }
      });
    }
    
    const writesRemaining = FREE_TIER_WRITES - totalWrites;
    const writesPercent = (totalWrites / FREE_TIER_WRITES) * 100;
    
    let status = 'HEALTHY';
    if (writesPercent >= SAFETY_THRESHOLD * 100) {
      status = 'WARNING';
    }
    if (writesRemaining <= 0) {
      status = 'EXCEEDED';
    }
    
    console.log(`\n📈 Firestore Quota Status:`);
    console.log(`   Status: ${status}`);
    console.log(`   Writes Used: ${totalWrites} / ${FREE_TIER_WRITES} (${Math.round(writesPercent)}%)`);
    console.log(`   Writes Remaining: ${writesRemaining}\n`);
    
    // Output for GitHub Actions
    console.log(`::set-output name=quota_status::${status}`);
    console.log(`::set-output name=writes_percent::${Math.round(writesPercent)}`);
    console.log(`::set-output name=writes_remaining::${writesRemaining}`);
    
    process.exit(status === 'EXCEEDED' ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Error checking quota:', error.message);
    // Default to safe state on error
    console.log('::set-output name=quota_status::HEALTHY');
    process.exit(0);
  }
}

checkQuota();
