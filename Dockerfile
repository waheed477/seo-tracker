# ── SEO Operating System — Production Dockerfile ────────────────────────────
#
# This Dockerfile builds the frontend and then serves BOTH the backend
# API and the built frontend from a single Express process on one port.
#
# No Chromium / Puppeteer is needed — the project uses axios + cheerio
# for HTTP crawling only (a deliberate architecture choice for hosting
# compatibility on constrained environments like Hugging Face Spaces).
#
# Build:   docker build -t seo-os .
# Run:     docker run -p 7860:7860 -e MONGO_URI=... seo-os

FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY backend/package.json backend/package-lock.json* ./backend/
COPY frontend/package.json frontend/package-lock.json* ./frontend/

# Install dependencies
RUN cd /app/backend && npm install --omit=dev --no-fund --no-audit && \
    cd /app/frontend && npm install --legacy-peer-deps --no-fund --no-audit

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build the frontend (Vite produces static assets in frontend/dist/)
RUN cd /app/frontend && npx vite build

# ── Production stage ────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

WORKDIR /app

# Copy backend package files and installed node_modules from builder
COPY --from=builder /app/backend/package.json /app/backend/
COPY --from=builder /app/backend/node_modules/ /app/backend/node_modules/

# Copy backend source
COPY --from=builder /app/backend/server/ /app/backend/server/
COPY --from=builder /app/backend/models/ /app/backend/models/
COPY --from=builder /app/backend/routes/ /app/backend/routes/
COPY --from=builder /app/backend/middleware/ /app/backend/middleware/
COPY --from=builder /app/backend/services/ /app/backend/services/
COPY --from=builder /app/backend/jobs/ /app/backend/jobs/
COPY --from=builder /app/backend/lib/ /app/backend/lib/

# Copy built frontend assets
COPY --from=builder /app/frontend/dist/ /app/frontend/dist/

# Hugging Face Spaces uses port 7860 by convention
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

# Start the backend server which also serves the frontend static files
CMD ["node", "/app/backend/server/index.js"]
