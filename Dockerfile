# Stage 1: Build the frontend, and install server dependencies
FROM node:22 AS builder

WORKDIR /app

# Define build-time arguments for Vite
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN

# Set them as environment variables for the builder stage
# Vite will use these during `npm run build`
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN

# Use a placeholder for the Gemini API key during the build process
# The real key is only used by the server at runtime.
RUN echo "API_KEY=dummy-key" > ./.env

# Copy all files from the current directory
COPY . ./

# Install server dependencies
WORKDIR /app/server
RUN npm install

# Install dependencies and build the frontend
WORKDIR /app
# The build process will now use the ENV variables set above
RUN bash -c 'if [ -f package.json ]; then npm install && npm run build; fi'


# Stage 2: Build the final server image
FROM node:22

WORKDIR /app

#Copy server files
COPY --from=builder /app/server .
# Copy built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]
