# 1) build stage
FROM node:24-bookworm AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# 2) runtime image
FROM node:24-bookworm
WORKDIR /app

# 1) Create the group/user
RUN addgroup -S app \
 && adduser -S -G app app

# 2) Copy files owned by that user
COPY --from=builder --chown=app:app /app /app

# 3) Switch to non-root
USER app

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
