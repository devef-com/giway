# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (no strict sync check)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build


# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/.output ./.output

# Copy PM2 ecosystem config
COPY ecosystem.config.cjs ./

# Copy drizzle migrations
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# Create entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Use entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]

# Default command
CMD ["pm2-runtime", "ecosystem.config.cjs"]