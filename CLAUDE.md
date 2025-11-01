# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A text-to-speech application that converts movie/theatre scripts into multi-character audio using Google's Gemini AI. Users authenticate via Google OAuth, the app extracts dialogue from scripts, detects character genders, and generates natural-sounding audio with different voices for each character.

## Architecture

### Frontend (React + Vite + TypeScript)
- **App.tsx**: Main orchestrator managing auth state, dialogue extraction workflow, and audio generation
- **services/geminiService.ts**: Core integration with Gemini API for dialogue extraction and TTS generation
  - Configures SDK to use `/api-proxy` in production via `httpOptions.baseUrl`
  - Handles both content extraction (gemini-2.5-flash) and audio synthesis (gemini-2.0-flash-exp)
- **contexts/AuthContext.tsx**: Google OAuth authentication using @react-oauth/google
- **components/**: UI components for script input, dialogue preview, audio playback, and auth

### Backend (Express.js)
- **server/server.js**: Proxy server that secures Gemini API calls
  - Verifies Google ID tokens for all `/api-proxy` requests
  - Rate limits requests (100 per 15 minutes per IP)
  - Proxies both HTTP and WebSocket connections to Gemini API
  - Injects GEMINI_API_KEY server-side to keep it secure

### API Proxy Architecture (API Key Security)

**Critical security mechanism**: The Gemini API key is completely hidden from the client in production.

**How it works:**
1. **Development mode** (`npm run dev`): SDK uses `VITE_GEMINI_API_KEY` directly to call Gemini API (no proxy, no auth required)
2. **Production mode**: SDK configured with `httpOptions.baseUrl` pointing to `/api-proxy` endpoint and includes Google ID token in `Authorization` header
3. **Authentication**: User's Google ID token is retrieved from `tokenManager` and included in every request
4. **Proxying**: Express server receives requests at `/api-proxy`, validates Google ID token, injects GEMINI_API_KEY, and forwards to real Gemini API
5. **Response**: API response flows back through proxy → frontend

**Result**: In production, browser DevTools Network tab shows only requests to `/api-proxy` (local server). The actual Gemini API calls with API key happen server-side and are never visible to the client.

**Key files:**
- `services/geminiService.ts`: Configures SDK to use `/api-proxy` in production and attaches auth token to requests
- `utils/tokenManager.ts`: Manages Google ID token storage and retrieval
- `server/server.js`: Express proxy that validates Google ID tokens and injects API key

### Key Data Flow
1. User pastes script → Frontend SDK calls Gemini API (direct in dev, via `/api-proxy` in production)
2. Server validates Google ID token → Proxies request to Gemini with API key (production only)
3. Gemini returns structured dialogue with character names, genders, delivery notes
4. User assigns voices → Frontend generates audio via Gemini Multimodal Live API (also proxied in production)
5. Audio chunks concatenated into single WAV file for playback/download

## Development Commands

### Frontend
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server on port 3000
npm run build        # Build production assets to dist/
```

### Backend
```bash
cd server
npm install          # Install server dependencies
npm run dev          # Start server with nodemon (hot reload)
npm start            # Start production server
```

### Development vs Production
- **Development**: Frontend calls Gemini API directly using `VITE_GEMINI_API_KEY` environment variable
- **Production**: All Gemini API calls are routed through `/api-proxy` server endpoint (API key never sent to client)

## Deployment (Google Cloud Run)

### Using Cloud Build

Deploy with substitution variables:
```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_GEMINI_API_KEY="your-key",_VITE_GOOGLE_CLIENT_ID="your-client-id"
```

### CI/CD Pipeline
- **cloudbuild.yaml**: Automated build and deployment
- **Dockerfile**: Multi-stage build (builder + runtime)
- **Build args**: `VITE_GOOGLE_CLIENT_ID` injected during Docker build
- **Runtime env vars**: `GEMINI_API_KEY` and `GOOGLE_CLOUD_PROJECT_ID` set on Cloud Run service

### Required Substitution Variables
- `_GEMINI_API_KEY`: Gemini API key for server
- `_VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID for frontend

## Environment Variables

### Frontend

The project uses environment-specific `.env` files:

**`.env.development`** (used by `npm run dev`):
```
VITE_GEMINI_API_KEY=your-gemini-api-key-here
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
# VITE_API_BASE_URL not set - SDK calls Gemini API directly
```

**`.env.production`** (used by `npm run build`):
```
VITE_API_BASE_URL=/api-proxy
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
# VITE_GEMINI_API_KEY not needed - server handles it
```

### Backend (server/.env)
```
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id  # required for Google ID token validation
PORT=3000  # optional, defaults to 3000
```

### Production (Cloud Run)
- `GEMINI_API_KEY`: Gemini API key
- `GOOGLE_CLIENT_ID`: Google OAuth client ID for ID token validation
- `VITE_GOOGLE_CLIENT_ID`: Set via Cloud Build substitutions during Docker build (frontend only)

## Key Technical Details

### Voice Assignment Logic
- Gemini detects character genders during extraction
- Male/neutral characters assigned from MALE_VOICES pool (Puck, Charon, Fenrir)
- Female characters assigned from FEMALE_VOICES pool (Kore, Zephyr)
- Voices distributed round-robin if more characters than available voices

### Audio Generation
- Uses Gemini 2.0 Flash Exp with Multimodal Live API
- Base64-encoded PCM audio chunks concatenated client-side
- Delivery notes map to emphasis levels: strong, moderate, reduced
- Output format: 24kHz, 16-bit, mono PCM wrapped in WAV

### Security Model
- **Environment-based routing**: SDK configured to use `/api-proxy` in production via `httpOptions.baseUrl`
- **Server-side proxying**: All Gemini API calls proxied through Express server with API key injected server-side
- **Google OAuth authentication**: Required for all `/api-proxy` requests
- **API key never exposed**: Browser network tab shows only `/api-proxy` requests, never actual Gemini API calls
- **Rate limiting**: 100 requests per 15 minutes per IP address
- **Token verification**: Google ID tokens verified using OIDC public keys (no service account needed)

## Important Files

- **types.ts**: TypeScript interfaces for DialogueLine, Character, ExtractedData
- **constants.ts**: Voice names and supported languages configuration
- **utils/audioUtils.ts**: PCM/WAV encoding, base64 decoding, audio concatenation
- **services/geminiService.ts**: Gemini SDK configuration with conditional proxy routing based on environment
- **server/server.js**: Express server with JWT-based Google ID token validation (no service account required)

## Testing Notes

The app requires valid Google OAuth and Gemini credentials to function. For testing:
1. Ensure both frontend and backend .env files are configured
2. Google OAuth client ID must be created in Google Cloud Console
3. **Development mode**: Server doesn't need to run - frontend calls Gemini API directly
4. **Production mode**: Server must be running on `http://localhost:3000` to proxy Gemini API calls
5. Check Network tab in production - should only see `/api-proxy/*` requests, never `generativelanguage.googleapis.com`
