#!/bin/bash
# Start script for ArchiScribe MCP Server
# Uses dev mode to avoid build issues with older Node.js

cd "$(dirname "$0")"

echo "========================================="
echo "Starting ArchiScribe MCP Server"
echo "========================================="
echo "Port: $(grep serverPort config/settings.json | grep -o '[0-9]*')"
echo "Model: $(grep modelPath config/settings.json | cut -d'"' -f4)"
echo "========================================="
echo ""

# Check if port is already in use
if lsof -Pi :3090 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠ Port 3090 is already in use"
    echo "Killing existing process..."
    lsof -ti:3090 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start the server in dev mode
echo "Starting server in development mode..."
npm run dev
