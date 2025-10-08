# Production-ready Dockerfile for Medhelm Backend
FROM node:18-alpine AS base

# Install security updates and create non-root user
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S medhelm -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Production dependencies stage
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Development dependencies stage (for building)
FROM base AS build-deps
RUN npm ci

# Build stage
FROM build-deps AS build
COPY . .
# Run any build steps if needed (e.g., TypeScript compilation)
# RUN npm run build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code with proper ownership
COPY --chown=medhelm:nodejs . .

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R medhelm:nodejs /app/uploads /app/logs

# Remove development files
RUN rm -rf tests/ *.test.js debug-*.js test-*.js

# Security: remove package manager and unnecessary files
RUN rm -f package-lock.json && \
    apk del --no-cache apk-tools

# Switch to non-root user
USER medhelm

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 5000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Production optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"