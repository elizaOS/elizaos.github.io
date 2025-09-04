#!/bin/bash

# Data verification script for ingestion completeness
# Checks for gaps and verifies coverage across the expected time range

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

log "Starting data verification for ingestion completeness..."

# Check basic data coverage
log "=== Basic Data Coverage ==="
sqlite3 data/db.sqlite "
SELECT 
    'PRs' as type,
    COUNT(*) as total,
    MIN(DATE(created_at)) as earliest,
    MAX(DATE(created_at)) as latest
FROM raw_pull_requests 
WHERE created_at >= '2024-01-01'
UNION ALL
SELECT 
    'Issues' as type,
    COUNT(*) as total,
    MIN(DATE(created_at)) as earliest,
    MAX(DATE(created_at)) as latest  
FROM raw_issues
WHERE created_at >= '2024-01-01';
"

# Check for date gaps in PR data (should show consistent weekly activity)
log "=== Weekly PR Activity (gaps indicate missing data) ==="
sqlite3 data/db.sqlite "
WITH RECURSIVE weeks AS (
    SELECT '2024-01-01' as week_start
    UNION ALL
    SELECT date(week_start, '+7 days')
    FROM weeks
    WHERE week_start < '2024-12-31'
)
SELECT 
    w.week_start,
    date(w.week_start, '+6 days') as week_end,
    COALESCE(pr_count, 0) as prs,
    CASE 
        WHEN COALESCE(pr_count, 0) = 0 THEN '❌ MISSING'
        WHEN COALESCE(pr_count, 0) < 10 THEN '⚠️  LOW'
        ELSE '✅ OK'
    END as status
FROM weeks w
LEFT JOIN (
    SELECT 
        date(created_at, 'weekday 0', '-6 days') as week_start,
        COUNT(*) as pr_count
    FROM raw_pull_requests 
    WHERE created_at >= '2024-01-01'
    GROUP BY date(created_at, 'weekday 0', '-6 days')
) pr ON w.week_start = pr.week_start
ORDER BY w.week_start;
"

# Check repository coverage
log "=== Repository Coverage ==="
sqlite3 data/db.sqlite "
SELECT 
    r.owner || '/' || r.name as full_name,
    COUNT(DISTINCT pr.number) as prs_2024,
    MIN(DATE(pr.created_at)) as earliest_pr,
    MAX(DATE(pr.created_at)) as latest_pr,
    r.lastFetchedAt
FROM repositories r
LEFT JOIN raw_pull_requests pr ON r.owner || '/' || r.name = pr.repository
    AND pr.created_at >= '2024-01-01'
GROUP BY r.repoId, r.owner, r.name
ORDER BY prs_2024 DESC;
"

# Check for suspicious patterns
log "=== Potential Issues ==="

# Repositories with no 2024 activity (might be missing)
no_activity=$(sqlite3 data/db.sqlite "
SELECT COUNT(*) FROM repositories r
WHERE NOT EXISTS (
    SELECT 1 FROM raw_pull_requests pr 
    WHERE r.owner || '/' || r.name = pr.repository AND pr.created_at >= '2024-01-01'
);")

if [ "$no_activity" -gt 0 ]; then
    warning "$no_activity repositories have no 2024 PR activity:"
    sqlite3 data/db.sqlite "
    SELECT r.owner || '/' || r.name as full_name, r.lastFetchedAt
    FROM repositories r
    WHERE NOT EXISTS (
        SELECT 1 FROM raw_pull_requests pr 
        WHERE r.owner || '/' || r.name = pr.repository AND pr.created_at >= '2024-01-01'
    )
    ORDER BY r.owner, r.name;
    "
fi

# Check for large gaps in daily activity
log "=== Daily Activity Gaps (30+ day gaps) ==="
sqlite3 data/db.sqlite "
WITH daily_activity AS (
    SELECT DATE(created_at) as activity_date
    FROM raw_pull_requests
    WHERE created_at >= '2024-01-01'
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
),
gaps AS (
    SELECT 
        activity_date,
        LAG(activity_date) OVER (ORDER BY activity_date) as prev_date,
        julianday(activity_date) - julianday(LAG(activity_date) OVER (ORDER BY activity_date)) as days_gap
    FROM daily_activity
)
SELECT 
    prev_date as gap_start,
    activity_date as gap_end,
    CAST(days_gap as INTEGER) as days_missing
FROM gaps
WHERE days_gap > 30
ORDER BY gap_start;
"

# Repository fetch status
log "=== Repository Fetch Status ==="
sqlite3 data/db.sqlite "
SELECT 
    CASE 
        WHEN lastFetchedAt IS NULL OR lastFetchedAt = '' THEN 'Never fetched'
        WHEN lastFetchedAt < '2024-12-01' THEN 'Incomplete (pre-Dec 2024)'
        ELSE 'Recently fetched'
    END as fetch_status,
    COUNT(*) as repo_count
FROM repositories
GROUP BY 
    CASE 
        WHEN lastFetchedAt IS NULL OR lastFetchedAt = '' THEN 'Never fetched'
        WHEN lastFetchedAt < '2024-12-01' THEN 'Incomplete (pre-Dec 2024)' 
        ELSE 'Recently fetched'
    END
ORDER BY repo_count DESC;
"

success "Data verification complete!"
log "Next steps if issues found:"
log "  1. For missing weeks: bun run pipeline ingest --after <start> --before <end> --force"
log "  2. For incomplete repos: Check GitHub API access and rate limits"
log "  3. For large gaps: Verify ingestion scripts ran successfully for those periods"