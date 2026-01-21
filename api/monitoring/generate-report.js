/**
 * Generate sync report - runs after sync to summarize results
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

async function generateReport() {
  try {
    console.log('\n📋 Generating sync report...\n');
    
    const today = new Date().toISOString().split('T')[0];
    const logDoc = await db.collection('sync_logs').doc(today).get();
    
    if (!logDoc.exists) {
      console.log('❌ No sync logs found for today');
      return;
    }
    
    const data = logDoc.data();
    
    console.log(`📅 Report for ${today}\n`);
    console.log('Tribunal Results:');
    console.log('─'.repeat(80));
    
    let totalFetched = 0;
    let totalWritten = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    Object.entries(data).forEach(([tribunal, stats]) => {
      if (typeof stats === 'object' && stats.success !== undefined) {
        const written = stats.success || 0;
        const failed = stats.failed || 0;
        const skipped = stats.updated || 0;
        const fetched = (stats.totalFetched || 0);
        
        totalFetched += fetched;
        totalWritten += written;
        totalSkipped += skipped;
        totalFailed += failed;
        
        const dedup = fetched > 0 ? Math.round((skipped / fetched) * 100) : 0;
        
        console.log(`\n${tribunal}:`);
        console.log(`  Fetched:        ${fetched}`);
        console.log(`  Written:        ${written}`);
        console.log(`  Skipped:        ${skipped} (${dedup}% dedup rate)`);
        console.log(`  Failed:         ${failed}`);
        console.log(`  Status:         ${written + skipped > 0 ? '✅ Success' : '⚠️ No writes'}`);
      }
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log(`\nSummary:`);
    console.log(`  Total Fetched:  ${totalFetched}`);
    console.log(`  Total Written:  ${totalWritten}`);
    console.log(`  Total Skipped:  ${totalSkipped}`);
    console.log(`  Total Failed:   ${totalFailed}`);
    console.log(`  Overall Status: ${totalFailed === 0 ? '✅ All tribunals successful' : '⚠️ Some failures'}`);
    console.log(`\nFirestore Impact:`);
    console.log(`  Write Operations Used: ${totalWritten} / 20,000`);
    console.log(`  Remaining Today: ${20000 - totalWritten}`);
    
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
  }
}

generateReport();
