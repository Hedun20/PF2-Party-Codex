FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY . .
RUN npm test && npm run build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3050

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node apps/server apps/server
COPY --chown=node:node --from=build /app/apps/web/dist apps/web/dist
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3050/api/health').then(async r=>{const body=await r.json();if(!r.ok||!body.ready)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/server/src/index.js"]
