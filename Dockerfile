# Base Image from Puppeteer - Includes Node + Chrome + non-root user (pptruser:pptruser)
FROM ghcr.io/puppeteer/puppeteer:24.43.1

WORKDIR /home/pptruser/app

COPY --chown=pptruser:pptruser package*.json ./

RUN npm ci --omit=dev

COPY --chown=pptruser:pptruser . .

CMD ["node", "server.js"]