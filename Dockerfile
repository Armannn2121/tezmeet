# 1) Веб-интерфейсті жинау
FROM node:24-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.ts ./
COPY shared ./shared
COPY web ./web
RUN npx vite build

# 2) Сервер: тек Node.js, сыртқы тәуелділіксіз
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/app/var
COPY package.json ./
COPY shared ./shared
COPY server ./server
COPY scripts ./scripts
COPY data ./data
COPY --from=web /app/web/dist ./web/dist
RUN mkdir -p /app/var && chown -R node:node /app/var
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server/index.ts"]
