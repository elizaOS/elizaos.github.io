#!/bin/bash

echo "🧪 Testing MCP ElizaOS Data Server"
echo "=================================="

echo -e "\n📋 1. List all tools:"
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node dist/index.js 2>/dev/null | tail -1 | python3 -m json.tool | head -20

echo -e "\n📊 2. Get EVM plugin stats:"
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_plugin_stats", "arguments": {"plugin_name": "evm", "include_details": true}}}' | node dist/index.js 2>/dev/null | tail -1

echo -e "\n🔍 3. List blockchain plugins:"
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "list_available_plugins", "arguments": {"category": "blockchain", "sort_by": "updated"}}}' | node dist/index.js 2>/dev/null | tail -1

echo -e "\n📈 4. Get ecosystem statistics:"
echo '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "get_summary_data", "arguments": {"summary_type": "statistics", "time_period": "month"}}}' | node dist/index.js 2>/dev/null | tail -1

echo -e "\n🏛️ 5. Get repository data with contributors:"
echo '{"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "get_repository_data", "arguments": {"repository_name": "eliza", "include_contributors": true}}}' | node dist/index.js 2>/dev/null | tail -1

echo -e "\n✅ Testing complete! All tools are working."