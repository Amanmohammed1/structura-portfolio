# Supabase Cron Job Setup for Daily Price Updates

## Overview
This sets up a daily cron job to update the price cache at Indian market close time.

## Setup Instructions

### 1. Enable pg_cron Extension
Go to Supabase Dashboard → Database → Extensions → Enable `pg_cron`

### 2. Create the Cron Job SQL
Run this in SQL Editor:

```sql
-- Schedule daily price cache update at 4:00 PM IST (10:00 UTC after market close at 3:30 PM IST)
SELECT cron.schedule(
    'daily-price-update', -- job name
    '0 10 * * 1-5', -- Run at 10:00 UTC (4:00 PM IST), Monday-Friday only
    $$
    SELECT net.http_post(
        url := 'https://rmkwzkdjsrmvngyybmbr.supabase.co/functions/v1/precache-prices'::text,
        headers := jsonb_build_object(
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJta3d6a2Rqc3Jtdm5neXlibWJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA3ODc2NywiZXhwIjoyMDgxNjU0NzY3fQ.YOUR_SERVICE_ROLE_KEY',
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $$
);
```

### 3. Verify Cron Job
```sql
SELECT * FROM cron.job;
```

### 4. View Job History
```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

## Schedule Explanation
- `0 10 * * 1-5` = 10:00 UTC (4:00 PM IST), Monday through Friday
- Indian market closes at 3:30 PM IST
- We run 30 minutes after close to ensure final prices are available

## Manual Trigger
To manually run the cache update:
```bash
curl -X POST https://rmkwzkdjsrmvngyybmbr.supabase.co/functions/v1/precache-prices \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```
