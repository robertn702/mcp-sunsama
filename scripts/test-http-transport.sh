#!/bin/bash

# Test script for HTTP transport
# Usage: ./test-http-transport.sh <email> <password>

set -e

EMAIL="${1:-$SUNSAMA_EMAIL}"
PASSWORD="${2:-$SUNSAMA_PASSWORD}"
BASE_URL="http://localhost:8080"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: $0 <email> <password>"
    echo "Or set SUNSAMA_EMAIL and SUNSAMA_PASSWORD environment variables"
    exit 1
fi

# Create Basic Auth header
AUTH=$(echo -n "$EMAIL:$PASSWORD" | base64)

echo "Testing HTTP Transport at $BASE_URL"
echo "========================================="

# Test 1: Health Check
echo -e "\n1. Testing health check endpoint..."
curl -s "$BASE_URL/" | jq '.'

# Test 2: List available tools
echo -e "\n2. Listing available tools..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools[] | .name' | head -10

# Test 3: Get current user
echo -e "\n3. Getting current user..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get-user",
      "arguments": {}
    },
    "id": 2
  }' | jq '.result.content[0].text' | jq -r '.' | jq '.email, .timezone'

# Test 4: Get backlog tasks (first 3)
echo -e "\n4. Getting backlog tasks..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get-tasks-backlog",
      "arguments": {}
    },
    "id": 3
  }' | jq '.result.content[0].text' | jq -r '.' | head -5

# Test 5: Get streams/channels
echo -e "\n5. Getting streams/channels..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get-streams",
      "arguments": {}
    },
    "id": 4
  }' | jq '.result.content[0].text' | jq -r '.' | head -5

# Test 6: Test authentication failure
echo -e "\n6. Testing authentication failure..."
curl -s -X POST "$BASE_URL/mcp" \
  -H "Authorization: Basic $(echo -n 'bad:credentials' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":5}' | jq '.error'

echo -e "\n✅ All tests completed!"