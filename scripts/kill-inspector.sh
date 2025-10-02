#!/bin/bash

echo "Cleaning up MCP inspector processes..."

# Kill all inspector-related processes
pkill -f "@modelcontextprotocol/inspector" || true

# Wait for graceful termination
sleep 1

# Force kill any remaining processes on inspector ports
for port in 6274 6277; do
  if lsof -i :$port >/dev/null 2>&1; then
    echo "Force killing process on port $port..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
  fi
done

# Final wait
sleep 1

echo "✓ Inspector processes cleaned up"
