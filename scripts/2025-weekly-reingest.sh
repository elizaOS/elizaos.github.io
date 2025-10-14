#!/bin/bash

# 2025 Weekly Re-ingestion Script
# Systematically re-ingest all of 2025 week by week with --force to ensure complete data
# Today is August 30, 2025, so we'll go through August 30

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Check GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    error "GITHUB_TOKEN is not set. Please export your GitHub token."
    exit 1
fi

log "GitHub token is set (length: ${#GITHUB_TOKEN})"
log "Starting systematic 2025 weekly re-ingestion with --force"
log "Target period: January 1, 2025 to August 30, 2025"

# Configuration  
START_DATE="2025-01-22"  # Resume from failed week
END_DATE="2025-08-30"  # Today
WAIT_BETWEEN_WEEKS=45   # 45 seconds between weeks to be gentle on API
TIMEOUT_SECONDS=300     # 5 minute timeout per week

# Counters
total_weeks=0
successful_weeks=0
failed_weeks=0

# Current processing date
current_date="$START_DATE"

log "Current 2025 data before re-ingestion:"
sqlite3 data/db.sqlite "SELECT COUNT(*) || ' PRs from ' || MIN(DATE(created_at)) || ' to ' || MAX(DATE(created_at)) FROM raw_pull_requests WHERE created_at LIKE '2025%';" 2>/dev/null

while [[ "$current_date" != $(date -d "$END_DATE + 1 day" '+%Y-%m-%d') ]]; do
    # Calculate end of current week (Sunday)
    week_end=$(date -d "$current_date + 6 days" '+%Y-%m-%d')
    
    # Don't go past our target end date
    if [[ "$week_end" > "$END_DATE" ]]; then
        week_end="$END_DATE"
    fi
    
    ((total_weeks++))
    
    log "Week $total_weeks: Processing $current_date to $week_end"
    
    # Run ingestion with force flag and timeout
    if timeout ${TIMEOUT_SECONDS}s bun run pipeline ingest --after "$current_date" --before "$week_end" --force > /tmp/weekly_ingest.log 2>&1; then
        ((successful_weeks++))
        success "Week $total_weeks completed: $current_date to $week_end"
        
        # Show brief summary
        grep -E "(Successfully stored|PRs.*issues.*commits)" /tmp/weekly_ingest.log | tail -1 || echo "Processing completed"
        
    else
        ((failed_weeks++))
        exit_code=$?
        
        if [ $exit_code -eq 124 ]; then
            warning "Week $total_weeks TIMED OUT: $current_date to $week_end (continuing...)"
        else
            warning "Week $total_weeks FAILED (exit $exit_code): $current_date to $week_end"
        fi
        
        # Show last few lines for debugging
        echo "Last 3 lines of output:"
        tail -3 /tmp/weekly_ingest.log
        
        # Check for rate limits
        if grep -qi "rate limit" /tmp/weekly_ingest.log; then
            warning "Rate limit detected - extending wait time for next week"
            WAIT_BETWEEN_WEEKS=120  # Extend to 2 minutes if we hit rate limits
        fi
    fi
    
    # Move to next week (add 7 days)
    current_date=$(date -d "$current_date + 7 days" '+%Y-%m-%d')
    
    # Don't wait after the last week - check if we have more weeks to process
    next_week_check=$(date -d "$current_date" '+%Y-%m-%d')
    end_date_plus_one=$(date -d "$END_DATE + 1 day" '+%Y-%m-%d')
    
    if [[ "$next_week_check" != "$end_date_plus_one" ]]; then
        log "Waiting $WAIT_BETWEEN_WEEKS seconds before next week... (Ctrl+C to stop)"
        sleep $WAIT_BETWEEN_WEEKS
    fi
    
    # Progress report every 5 weeks
    if (( total_weeks % 5 == 0 )); then
        log "Progress: $total_weeks weeks processed ($successful_weeks successful, $failed_weeks failed)"
    fi
done

log "2025 Weekly re-ingestion completed!"
log "Total weeks processed: $total_weeks"
log "Successful: $successful_weeks"
log "Failed/Timeout: $failed_weeks"

# Show final 2025 data count
log "Final 2025 data after re-ingestion:"
sqlite3 data/db.sqlite "SELECT COUNT(*) || ' PRs from ' || MIN(DATE(created_at)) || ' to ' || MAX(DATE(created_at)) FROM raw_pull_requests WHERE created_at LIKE '2025%';" 2>/dev/null

# Show monthly breakdown
log "2025 Monthly breakdown:"
sqlite3 data/db.sqlite "
SELECT 
    strftime('%Y-%m', created_at) as month,
    COUNT(*) as prs 
FROM raw_pull_requests 
WHERE created_at LIKE '2025%'
GROUP BY strftime('%Y-%m', created_at)
ORDER BY month;
" 2>/dev/null

success "All 2025 weekly ingestion complete!"
log "Next steps:"
log "  1. Run: bun run pipeline process --force"
log "  2. Run: bun run pipeline export --all" 
log "  3. Run: bun run pipeline summarize -t contributors --all"