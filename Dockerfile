# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apt-get update && \
    apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    postgresql \
    libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -m -u 1001 -g nodejs medhelm

# Create necessary directories and set permissions
RUN mkdir -p logs uploads public && \
    chown -R medhelm:nodejs /app

# Switch to non-root user
USER medhelm

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]
