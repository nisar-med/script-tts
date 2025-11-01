# Stage 1: Build the frontend, and install server dependencies
FROM node:22 AS builder

WORKDIR /app

# Define build-time arguments for Vite
ARG VITE_GOOGLE_CLIENT_ID

# Set environment variables for Vite build
ENV VITE_API_BASE_URL=/api-proxy
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Copy all files from the current directory
COPY . ./

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Install dependencies and build the frontend
WORKDIR /app
RUN mkdir dist
RUN bash -c 'if [ -f package.json ]; then npm install && npm run build; fi'


# Stage 2: Build the final server image
FROM node:22-bookworm-slim

WORKDIR /app

#Copy server files
COPY --from=builder /app/server .
# Copy built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]
