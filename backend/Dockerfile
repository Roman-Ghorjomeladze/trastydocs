# Stage 1: Development
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build && ls -la dist/

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/mail ./mail
COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs prisma.config.ts ./

RUN mkdir -p uploads && chown nestjs:nodejs uploads

USER nestjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { if (r.statusCode !== 200) throw new Error(); })"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
