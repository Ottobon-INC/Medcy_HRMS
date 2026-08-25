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

# Pass Supabase environment variables at build-time for Vite bundling
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

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
