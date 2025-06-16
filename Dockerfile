# ----- Build Stage -----
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy package and configuration files
COPY package.json bun.lock* tsconfig.json ./

# Copy source code
COPY src ./src

# Install dependencies and build
RUN bun install && bun run build

# ----- Production Stage -----
FROM oven/bun:1-alpine
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Copy package.json for production install
COPY package.json ./

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Set environment defaults for containerized deployment
ENV TRANSPORT_TYPE=httpStream
ENV PORT=3000

# Expose HTTP port
EXPOSE 3000

# Start the application
CMD ["bun", "dist/main.js"]