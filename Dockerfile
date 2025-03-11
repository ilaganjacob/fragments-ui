# Multi-stage build for fragments-ui web application

# Stage 1: Build stage
FROM node:20-alpine AS builder

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
FROM nginx:alpine AS production

# Copy the built assets from the builder stage to the nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# In the builder stage, copy environment variables
COPY .env .env

# Use a build argument for the API URL
ARG API_URL
ENV API_URL=${API_URL}

ARG AWS_COGNITO_POOL_ID
ENV AWS_COGNITO_POOL_ID=${AWS_COGNITO_POOL_ID}

ARG AWS_COGNITO_CLIENT_ID
ENV AWS_COGNITO_CLIENT_ID=${AWS_COGNITO_CLIENT_ID}

ARG OAUTH_SIGN_IN_REDIRECT_URL
ENV OAUTH_SIGN_IN_REDIRECT_URL=${OAUTH_SIGN_IN_REDIRECT_URL}

# Expose the default NGINX port
EXPOSE 80

# NGINX has its own healthcheck mechanism, but we can add a custom one if desired
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

