# ==========================================
# Stage 1: Build Frontend (Vite + React + PWA)
# ==========================================
FROM node:22-alpine AS build

WORKDIR /app

# Copy package descriptors first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install clean dependencies
RUN npm ci --prefer-offline --no-audit

# Copy application source code
COPY . .

# Pass build-time environment variables for Vite bundling
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_FEATURE_LIVE_TRACKING=true
ARG VITE_MAP_TILE_URL="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
ARG VITE_MAP_TILE_ATTRIBUTION="&copy; OpenStreetMap contributors"
ARG VITE_MAP_DEFAULT_LAT=17.6868
ARG VITE_MAP_DEFAULT_LNG=83.2185
ARG VITE_MAP_DEFAULT_ZOOM=13
ARG VITE_OSRM_ENDPOINT="https://router.project-osrm.org"
ARG VITE_LIVE_BROADCAST_INTERVAL_MS=10000

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_FEATURE_LIVE_TRACKING=$VITE_FEATURE_LIVE_TRACKING
ENV VITE_MAP_TILE_URL=$VITE_MAP_TILE_URL
ENV VITE_MAP_TILE_ATTRIBUTION=$VITE_MAP_TILE_ATTRIBUTION
ENV VITE_MAP_DEFAULT_LAT=$VITE_MAP_DEFAULT_LAT
ENV VITE_MAP_DEFAULT_LNG=$VITE_MAP_DEFAULT_LNG
ENV VITE_MAP_DEFAULT_ZOOM=$VITE_MAP_DEFAULT_ZOOM
ENV VITE_OSRM_ENDPOINT=$VITE_OSRM_ENDPOINT
ENV VITE_LIVE_BROADCAST_INTERVAL_MS=$VITE_LIVE_BROADCAST_INTERVAL_MS


# Compile production bundle
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Server
# ==========================================
FROM nginx:alpine

# Remove default Nginx website config
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy custom Nginx configuration with SPA routing & PWA caching headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled production artifacts from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
