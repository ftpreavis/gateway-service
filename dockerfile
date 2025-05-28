# ----------------------------------------------------------------------------
# 1) Builder stage: install ALL deps, run any build/transpile step
# ----------------------------------------------------------------------------
FROM node:24 AS builder
WORKDIR /app

# Copy manifest and install ALL deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source; if you have a build step (e.g. Babel/TypeScript), run it here:
COPY . .
# RUN npm run build

# ----------------------------------------------------------------------------
# 2) Runtime stage: fresh Node, only production deps
# ----------------------------------------------------------------------------
FROM node:24
WORKDIR /app

# 1) Create a non-root user
RUN adduser --system --no-create-home --group app

# 3) Install only prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/index.js ./
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/wait-for-vault.sh /wait-for-vault.sh
RUN chmod +x /wait-for-vault.sh

USER app

EXPOSE 3000
CMD ["/bin/sh", "-c", "/wait-for-vault.sh && exec node index.js"]
