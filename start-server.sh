#!/bin/bash
cd "$(dirname "$0")"
echo "Starting ArchiScribe MCP Server on port 3090..."
echo "Model path: $(grep modelPath config/settings.json | cut -d'"' -f4)"
npm run dev
