# ── Stage 1: Build the React frontend ─────────────────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --prefer-offline
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend --omit=dev --prefer-offline

# Copy backend source
COPY backend/ ./backend/

# Copy the React production build from Stage 1
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Ensure the uploads directory exists
RUN mkdir -p /app/backend/uploads

# SQLite DB lives on a persistent mount at /home/data (set via DB_PATH env var).
# Create a fallback directory so the app still runs without a mount.
RUN mkdir -p /home/data

ENV NODE_ENV=production
ENV PORT=8080
# DB_PATH is set by the App Service application settings to /home/data/ica_usage.db

EXPOSE 8080

CMD ["node", "backend/server.js"]
