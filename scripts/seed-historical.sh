#!/bin/bash
# Batch Historical Data Seeder
# Runs the seed-historical Edge Function in batches
# Use this for initial 5Y data load or hard reset

SUPABASE_URL="https://rmkwzkdjsrmvngyybmbr.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJta3d6a2Rqc3Jtdm5neXlibWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzg3NjcsImV4cCI6MjA4MTY1NDc2N30.fc92gOWeR6oHom9qr7DmsHi2y82cAnd-IxDPXL5G6UQ"

echo "=== Structura Historical Data Seeder ==="
echo "This will fetch 5Y data for all 50 NIFTY stocks + index"
echo ""

# Process in batches of 10 (total ~50 stocks = 5 batches)
BATCH_SIZE=10
TOTAL_STOCKS=50
BATCH_START=0

while [ $BATCH_START -lt $TOTAL_STOCKS ]; do
    echo "Processing batch starting at $BATCH_START..."
    
    RESPONSE=$(curl -s -X POST "$SUPABASE_URL/functions/v1/seed-historical" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"batchStart\": $BATCH_START, \"batchSize\": $BATCH_SIZE}")
    
    # Parse response
    PROCESSED=$(echo $RESPONSE | jq -r '.summary.processed // 0')
    FAILED=$(echo $RESPONSE | jq -r '.summary.failed // 0')
    TOTAL_DAYS=$(echo $RESPONSE | jq -r '.summary.totalDays // 0')
    
    echo "  Processed: $PROCESSED stocks"
    echo "  Failed: $FAILED stocks"
    echo "  Days cached: $TOTAL_DAYS"
    echo ""
    
    BATCH_START=$((BATCH_START + BATCH_SIZE))
    
    # Wait 2 seconds between batches to avoid rate limiting
    if [ $BATCH_START -lt $TOTAL_STOCKS ]; then
        echo "Waiting 2s before next batch..."
        sleep 2
    fi
done

echo "=== Seeding Complete! ==="
echo ""
echo "Verify data with:"
echo "  curl '$SUPABASE_URL/rest/v1/structura_price_cache?select=symbol,count()&group=symbol' -H 'apikey: $SUPABASE_ANON_KEY'"
