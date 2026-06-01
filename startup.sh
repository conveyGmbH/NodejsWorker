#!/bin/bash
set -e

echo "Installing Chrome dependencies..."
apt-get update && apt-get install -y \
  libglib2.0-0t64 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libcups2t64 libdrm2 libgbm1 libpango-1.0-0 libcairo2 \
  libasound2t64 libxshmfence1 libnspr4 libdbus-1-3 libxcomposite1 \
  libxdamage1 libxrandr2 fonts-liberation libxkbcommon0 libxfixes3 \
  --no-install-recommends

echo "Installing Chrome browser..."
npx puppeteer browsers install chrome

echo "Starting application..."
node server.js