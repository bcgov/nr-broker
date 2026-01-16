#!/usr/bin/env bash

# Source and destination directories
SOURCE_DIR="../api/src"
DEST_DIR="../ui/src/app/service"

# Ensure the destination directory exists
mkdir -p "$DEST_DIR"

# Find .dto.ts files and copy them while preserving directory structure
find "$SOURCE_DIR" -type f -name "*.dto.ts" | while read -r file; do
  # Recreate directory structure in the destination
  rel_path="${file#$SOURCE_DIR/}"
  mkdir -p "$DEST_DIR/$(dirname "$rel_path")"
  cp "$file" "$DEST_DIR/$rel_path"
done

# Remove empty folders in the destination directory
find "$DEST_DIR" -type d -empty -delete

echo "All .dto.ts files have been copied to $DEST_DIR"