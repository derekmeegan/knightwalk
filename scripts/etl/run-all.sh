#!/bin/bash

# ETL Runner Script
# Processes all Lichess Elite Database PGN files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PGN_DIR="$HOME/Downloads/Lichess Elite Database"

cd "$PROJECT_DIR"

echo "==================================="
echo "Lichess ETL Pipeline - Full Run"
echo "==================================="
echo ""
echo "PGN Directory: $PGN_DIR"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Count files
FILE_COUNT=$(ls -1 "$PGN_DIR"/*.pgn 2>/dev/null | wc -l | tr -d ' ')
echo "Found $FILE_COUNT PGN files to process"
echo ""

# Check if dry run
if [[ "$1" == "--dry-run" ]]; then
    echo "DRY RUN MODE - No data will be inserted"
    DRY_RUN="--dry-run"
else
    DRY_RUN=""
fi

# Process each file
PROCESSED=0
FAILED=0

for pgn_file in "$PGN_DIR"/*.pgn; do
    filename=$(basename "$pgn_file")
    PROCESSED=$((PROCESSED + 1))

    echo ""
    echo "[$PROCESSED/$FILE_COUNT] Processing: $filename"
    echo "-------------------------------------------"

    if npx tsx scripts/etl/import-lichess.ts "$pgn_file" --max-moves=20 --batch-size=250 $DRY_RUN; then
        echo "✓ Completed: $filename"
    else
        echo "✗ Failed: $filename"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "==================================="
echo "ETL Complete"
echo "==================================="
echo "Processed: $PROCESSED files"
echo "Failed: $FAILED files"
