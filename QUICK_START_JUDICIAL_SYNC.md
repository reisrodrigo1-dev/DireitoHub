# 🚀 Quick Start Guide - Judicial Data Aggregation

## 5-Minute Setup

### Step 1: Get API Keys

**DataJud API Key:**
- Email: sistemasnacionais@cnj.jus.br
- Subject: "Solicitar acesso à API DataJud"
- Mention: Use for judicial case aggregation in DireitoHub
- Takes 2-3 business days

**Firebase Admin Key:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select: `direitohub-74b76` project
3. Navigate: `Settings > Service Accounts`
4. Click: `Generate new private key`
5. Copy JSON contents (keep it safe!)

### Step 2: Add GitHub Secrets

1. Go to: `github.com/your-repo/settings/secrets/actions`
2. Click: `New repository secret`
3. Add these 3 secrets:

| Name | Value |
|------|-------|
| `DATAJUD_API_KEY` | Your DataJud API key |
| `FIREBASE_ADMIN_KEY` | Complete JSON from Step 1 |
| `FIREBASE_ADMIN_DB_URL` | `https://direitohub-74b76.firebaseio.com` |

### Step 3: Deploy Security Rules

**Using Firebase CLI:**
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

**Or manually in Firebase Console:**
1. Go to: `Firestore > Rules`
2. Copy contents of `firestore.rules`
3. Click: `Publish`

### Step 4: Test Sync

```bash
# From project root
$env:DATAJUD_API_KEY = "your_key"
$env:FIREBASE_ADMIN_KEY = 'paste_json_here'
$env:FIREBASE_ADMIN_DB_URL = "https://direitohub-74b76.firebaseio.com"

node api/cron/sync-tribunal.js TJSP
```

You should see:
```
🏛️ Starting sync for tribunal: TJSP
📥 Fetched 45 cases from DataJud
✅ Normalized 45 cases
📊 Written: 18 (27 skipped)
✅ Sync complete
```

### Step 5: Check Firestore

1. Go to: [Firestore Console](https://console.firebase.google.com)
2. Navigate: `Collections > judicial_processes`
3. You should see cases appearing with:
   - `numeroProcesso`
   - `tribunal: "TJSP"`
   - `partes` (plaintiff, defendant)
   - `dataAjuizamento`

✅ **Done! Sync is working**

---

## What Happens Now

### GitHub Actions Automation
- ✅ Runs automatically 3x daily
- ✅ 8 AM, 2 PM, 8 PM (São Paulo time)
- ✅ Syncs TJSP, TJRJ, TJMG
- ✅ You get email if something fails

### Monitor Progress
1. **GitHub Actions**: Repo > Actions > Daily Judicial Data Sync
2. **Firestore**: Console > Collections > sync_logs
3. **Dashboard**: Add QuotaDashboard to admin panel

### Expected Results
- **Day 1-2**: ~100-200 new cases from TJSP
- **Day 3+**: ~50 new cases/day (rest are deduped)
- **Quota**: Uses ~300 writes/day (~1.5% of limit)

---

## Adding More Courts

Edit `.github/workflows/judicial-sync.yml`:

```yaml
- name: Sync TJRS
  run: node api/cron/sync-tribunal.js TJRS
  env:
    DATAJUD_API_KEY: ${{ secrets.DATAJUD_API_KEY }}
    ...

- name: Sync TJMG
  run: node api/cron/sync-tribunal.js TJMG
  ...
```

Supported courts: TJSP, TJRJ, TJMG, TJRS, TJPR, TJSC, TJBA, TJPE, TJCE, TJPA, TJGO, TJMT, TJMS, TJDFT

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key invalid" | Double-check GitHub secret matches DataJud key |
| "No cases found" | DataJud only has recent cases, wait 1-2 days |
| "Quota exceeded" | Happens after >20K writes, reset at midnight UTC |
| "Circuit breaker open" | DataJud API down, automatic retry in 5 minutes |

---

## Next Steps

1. ✅ Get API keys (2-3 days)
2. ✅ Add GitHub secrets (1 minute)
3. ✅ Deploy security rules (1 minute)
4. ✅ Test sync (2 minutes)
5. 📊 Wait for automatic runs (3x daily)
6. 🔍 Monitor progress in Firestore
7. 📈 Add quota dashboard to admin
8. 🌍 Scale to more courts

---

## Questions?

See: `JUDICIAL_SYNC_IMPLEMENTATION.md` for detailed documentation
