FROM node:24-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --registry=https://registry.npmmirror.com --production

# Copy source
COPY . .

# Build
RUN npm run build

# Runtime
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=base /app/public ./public
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/data ./data

EXPOSE 3000

CMD ["node", "server.js"]
