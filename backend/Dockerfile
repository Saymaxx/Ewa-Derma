# Multi-stage Dockerfile for Ewa Derma NestJS Backend
FROM node:20-alpine AS builder

WORKDIR /app/backend

# Copy package manifests and install dependencies
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

# Generate Prisma Client & Build Application
RUN npx prisma generate
COPY backend/ ./
RUN npm run build

# Production Image Stage
FROM node:20-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules and built assets from builder
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

EXPOSE 4000

CMD ["npm", "run", "deploy:start"]
