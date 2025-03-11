# Multi-stage build for fragments-ui web application

# Stage 1: Build stage
FROM node:20.18.0-alpine@sha256:b1e0880c3af955867bc2f1944b49d20187beb7afa3f30173e15a97149ab7f5f1 AS builder

LABEL maintainer="Jacob Ilagan <jilagan5@myseneca.ca>"
LABEL description="Fragments UI - Frontend for Fragments Microservice"

# Create app directory and set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source files
COPY . .

# Build the application (creates minified static files)
RUN npm run build

# Stage 2: Production stage using NGINX
FROM nginx:1.25.3-alpine@sha256:a83b9f3e5a5ef3ac470bf6e05bb718a914e42f3ae58f3fbd303c355c5a78b7e1 AS production

# Copy the built assets from the builder stage to the nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom nginx configuration file if needed
# COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Expose the default NGINX port
EXPOSE 80

# NGINX has its own healthcheck mechanism, but we can add a custom one if desired
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# NGINX starts automatically in this image, no need for CMD