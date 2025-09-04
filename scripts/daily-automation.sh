#!/bin/bash
# Simple daily automation - runs full pipeline every 24 hours

while true; do
    echo "Starting daily pipeline run at $(date)"
    
    # Full pipeline sequence
    bun run pipeline ingest && \
    bun run pipeline process && \
    bun run pipeline export && \
    bun run pipeline summarize -t overall && \
    bun run pipeline summarize -t repository && \
    bun run pipeline summarize -t contributors
    
    if [ $? -eq 0 ]; then
        echo "Pipeline completed successfully at $(date)"
    else
        echo "Pipeline failed at $(date)" 
    fi
    
    # Sleep for 24 hours (86400 seconds)
    echo "Sleeping for 24 hours..."
    sleep 86400
done