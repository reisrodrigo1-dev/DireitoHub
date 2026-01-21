# Judicial Data Aggregation - Implementation Guide

## ✅ Phase 0 Complete: Infrastructure Setup

### What Was Created

#### 1. **Directory Structure**
```
DireitoHub/
├── api/
│   ├── datajud/          # DataJud API integration
│   ├── utils/            # Shared utilities
│   │   ├── normalize-judicial-data.js   # Data transformation
│   │   ├── deduplication.js              # Change detection
│   │   ├── resilience.js                 # Retry logic
│   │   └── datajud-client.js             # API client
│   ├── cron/             # Scheduled tasks
│   │   └── sync-tribunal.js              # Main sync orchestrator
│   └── monitoring/       # Observability
│       ├── quota-tracker.js              # Usage monitoring
│       ├── check-quota.js                # Pre-sync validation
│       └── generate-report.js            # Post-sync reporting
├── .github/workflows/
│   └── judicial-sync.yml                 # GitHub Actions automation
├── src/components/
│   └── QuotaDashboard.jsx                # Admin quota display
└── firestore.rules                       # Security rules (updated)
```

#### 2. **Firestore Collections** (Created)
```
judicial_processes/
  ├─ processoId (PK)
  ├─ numeroProcesso (formatted)
  ├─ tribunal
  ├─ partes
  ├─ ultimoMovimento
  └─ syncStatus
     └─ movimentos/ (subcollection)

sync_logs/
  ├─ logDate (daily aggregation)
  ├─ tribunal stats
  └─ deduplication rates

error_tracking/ (for debugging)
batch_queue/ (for job management)
```

#### 3. **Utility Functions**
- **Normalization**: Convert raw DataJud JSON → Firestore schema
- **Deduplication**: Hash-based change detection (saves ~60% writes)
- **Resilience**: Retry with exponential backoff + circuit breaker
- **DataJud Client**: Authenticated Elasticsearch queries

#### 4. **GitHub Actions Workflow**
- ✅ Runs 3x daily (8 AM, 2 PM, 8 PM São Paulo time)
- ✅ Quota check before sync
- ✅ Processes TJSP, TJRJ, TJMG in parallel (continue-on-error)
- ✅ Generates daily report
- ✅ Manual trigger option

#### 5. **Security**
- ✅ Firebase rules restrict writes to admin-only
- ✅ Public read access for case search
- ✅ Admin credentials in GitHub Secrets (not in code)

#### 6. **Monitoring**
- ✅ QuotaDashboard component for real-time tracking
- ✅ Pre-sync quota validation
- ✅ Post-sync summary reporting

---

## 🚀 Next Steps: Phase 1 (TJSP Integration)

### 1. Setup GitHub Secrets

Go to: `GitHub Repo > Settings > Secrets and variables > Actions`

Add these secrets:

```
DATAJUD_API_KEY
  Value: Your DataJud API key from CNJ

FIREBASE_ADMIN_KEY
  Value: Complete JSON from Firebase Console > Project Settings > 
         Service Accounts > Generate new private key
         
FIREBASE_ADMIN_DB_URL
  Value: https://direitohub-74b76.firebaseio.com
```

### 2. Deploy Firestore Security Rules

```bash
# Requires Firebase CLI
firebase login
firebase deploy --only firestore:rules
```

Or manually in Firebase Console > Firestore > Rules

### 3. Test Manual Sync

```bash
# Set environment variables
$env:DATAJUD_API_KEY = "your_key"
$env:FIREBASE_ADMIN_KEY = '{"type":"service_account",...}'
$env:FIREBASE_ADMIN_DB_URL = "https://direitohub-74b76.firebaseio.com"

# Run sync
node api/cron/sync-tribunal.js TJSP
```

Expected output:
```
🏛️ Starting sync for tribunal: TJSP
📥 Fetched 45 cases from DataJud
✅ Normalized 45 cases
📊 Results for TJSP:
   Fetched: 45
   Processed: 45
   Written: 18 (27 skipped)
   Deduplication rate: 60%
✅ Sync complete for TJSP in 3.21s
```

### 4. Deploy to Vercel (Optional - for frontend integration)

```bash
# Push to GitHub - automatic deployment
git push origin main

# Or manual Vercel deploy
vercel deploy --prod
```

### 5. Test Frontend Quota Dashboard

1. Import QuotaDashboard in your admin page:
```jsx
import QuotaDashboard from '../components/QuotaDashboard';

export default function AdminPanel() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <QuotaDashboard />
    </div>
  );
}
```

2. View at: `https://your-app.vercel.app/admin`

---

## 📊 Firestore Indexes Setup

Some queries need composite indexes. They'll be created automatically when you first run the sync, but you can pre-create them:

1. Go to Firebase Console > Firestore > Indexes
2. Create these composite indexes:
   - Collection: `judicial_processes`
   - Fields: `tribunal` (ASC), `syncStatus` (ASC), `dataAjuizamento` (DESC)
   - Collection: `judicial_processes`
   - Fields: `status` (ASC), `dataUltimaAtualizacao` (DESC)

---

## 🔍 Monitoring the Sync

### Check Logs

**GitHub Actions:**
- Go to: `Repo > Actions > Daily Judicial Data Sync`
- Click latest run
- View output for each tribunal

**Firestore Logs:**
- Collection: `sync_logs`
- Doc ID: Today's date (YYYY-MM-DD)
- Fields show: success count, failed count, deduplication rate

**Error Tracking:**
- Collection: `error_tracking`
- View failed syncs for debugging

---

## 📈 Scaling (Phase 2 - Coming Soon)

After TJSP is stable for 1 week, expand to:
- TJRJ (Rio de Janeiro)
- TJMG (Minas Gerais)
- TJRS (Rio Grande do Sul)
- TJPR (Paraná)

Just add lines to `judicial-sync.yml`:
```yaml
- name: Sync TJRS
  run: node api/cron/sync-tribunal.js TJRS
  env: ...
```

---

## ⚠️ Troubleshooting

### "Quota exceeded"
- Check `sync_logs` collection for today
- If >20K writes, wait until midnight (UTC)
- Or upgrade to Blaze tier

### "DataJud API rate limited"
- Circuit breaker activates after 5 failures
- Waits 5 minutes before retry
- Check error_tracking collection

### "No data normalized"
- Check raw API response format
- Ensure DataJud API key is valid
- Look at error details in console

---

## 📝 Configuration Reference

### Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| DATAJUD_API_KEY | ✅ | `aB1cD2...` | From CNJ |
| FIREBASE_ADMIN_KEY | ✅ | `{...json...}` | From Firebase Console |
| FIREBASE_ADMIN_DB_URL | ✅ | `https://...` | Firestore URL |
| SLACK_WEBHOOK_URL | ❌ | `https://hooks...` | For notifications |

---

## 🎯 Success Criteria

You'll know it's working when:

1. ✅ First sync runs without errors
2. ✅ Cases appear in Firestore `judicial_processes` collection
3. ✅ `sync_logs` shows write counts > 0
4. ✅ Deduplication rate > 50% (on second run)
5. ✅ QuotaDashboard shows write usage
6. ✅ GitHub Actions workflow completes

---

## Next: Phase 1 Checkpoint

After testing with TJSP:
1. Verify data quality in Firestore Console
2. Check quota is <20% of daily limit
3. Monitor error_tracking for issues
4. Review deduplication effectiveness
5. Ready to scale to Phase 2

**Est. Timeline**: 2 weeks of stable TJSP syncs → Phase 2
