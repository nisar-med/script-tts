# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A text-to-speech application that converts movie/theatre scripts into multi-character audio using Google's Gemini AI. The app extracts dialogue from scripts, detects character genders, and generates natural-sounding audio with different voices for each character.

## Architecture

### Frontend (React + Vite + TypeScript)
- **App.tsx**: Main orchestrator managing auth state, dialogue extraction workflow, and audio generation
- **services/geminiService.ts**: Core integration with Gemini API for dialogue extraction and TTS generation
  - Uses custom fetch to inject Firebase auth tokens
  - Handles both content extraction (gemini-2.5-flash) and audio synthesis (gemini-2.0-flash-exp)
- **firebase/config.ts**: Firebase authentication configuration
- **components/**: UI components for script input, dialogue preview, audio playback, and auth

### Backend (Express.js)
- **server/server.js**: Proxy server that secures Gemini API calls
  - Verifies Firebase ID tokens for all `/api-proxy` requests
  - Rate limits requests (100 per 15 minutes per IP)
  - Proxies both HTTP and WebSocket connections to Gemini API
  - Injects GEMINI_API_KEY server-side to keep it secure

### Service Worker Architecture (API Key Hiding)

**Critical security mechanism**: The Gemini API key is completely hidden from browser network inspection.

**How it works:**
1. **Injection**: When serving `index.html`, `server/server.js` dynamically injects a service worker registration script into the `<head>` tag (only if API key is present)
2. **Registration**: On page load, the injected script registers `./service-worker.js` with the browser
3. **Interception**: The service worker (`server/public/service-worker.js`) intercepts ALL fetch requests to `https://generativelanguage.googleapis.com/*`
4. **Rewriting**: Intercepted requests are rewritten to point to local `/api-proxy/*` endpoint instead
5. **Proxying**: Express server receives the request at `/api-proxy`, validates Firebase auth token, injects GEMINI_API_KEY, and forwards to real Gemini API
6. **Response**: API response flows back through proxy → service worker → frontend

**Result**: Browser DevTools Network tab shows only requests to `/api-proxy` (local server). The actual Gemini API calls with API key happen server-side and are never visible to the client.

**Key files:**
- `server/server.js:214-230`: Service worker registration script (injected into HTML)
- `server/server.js:273-275`: Route serving the service worker file
- `server/public/service-worker.js`: Service worker that intercepts and rewrites requests

### Key Data Flow
1. User pastes script → Frontend code calls Gemini API at `generativelanguage.googleapis.com`
2. Service worker intercepts request → Rewrites to `/api-proxy` endpoint
3. Server validates Firebase token → Proxies request to Gemini with API key
4. Gemini returns structured dialogue with character names, genders, delivery notes
5. User assigns voices → Frontend generates audio via Gemini Multimodal Live API (also intercepted and proxied)
6. Audio chunks concatenated into single WAV file for playback/download

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

### Service Worker Support
The server runs on HTTP at `localhost:3000`. Service workers work on localhost over HTTP without requiring HTTPS (browsers have a special exception for localhost development). In production (Cloud Run), HTTPS is automatically provided by the platform.

## Deployment (Google Cloud Run)

### One-Time Setup
1. Create Gemini API key secret:
```bash
echo -n "${GEMINI_API_KEY}" | gcloud secrets create gemini_api_key --data-file=-
```

### Deploy
```bash
gcloud run deploy my-app --source=. --update-secrets=GEMINI_API_KEY=gemini_api_key:latest
```

### CI/CD (Cloud Build)
- **cloudbuild.yaml**: Automated build and deployment pipeline
- Requires substitution variables for Firebase config and Gemini API key
- Multi-stage Docker build (see Dockerfile)

## Environment Variables

### Frontend (.env in root)
```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
```

### Backend (server/.env)
```
GEMINI_API_KEY=your-gemini-api-key
FIREBASE_PROJECT_ID=your-firebase-project-id  # required for token validation
PORT=3000  # optional, defaults to 3000
```

### Production (Cloud Run)
- `API_KEY` or `GEMINI_API_KEY`: Gemini API key (injected via secrets)
- `FIREBASE_PROJECT_ID` or `VITE_FIREBASE_PROJECT_ID`: Firebase project ID for token validation
- `VITE_FIREBASE_*`: Set via Cloud Build substitutions during Docker build

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
- **Service worker interception**: Frontend code calls Gemini API directly, but service worker intercepts and redirects to local proxy
- **Server-side proxying**: All Gemini API calls proxied through Express server with API key injected server-side
- **Firebase authentication**: Required for all `/api-proxy` requests
- **API key never exposed**: Browser network tab shows only `/api-proxy` requests, never actual Gemini API calls
- **Rate limiting**: 100 requests per 15 minutes per IP address
- **Token verification**: Firebase ID tokens verified using public keys (no service account needed)

## Important Files

- **types.ts**: TypeScript interfaces for DialogueLine, Character, ExtractedData
- **constants.ts**: Voice names and supported languages configuration
- **utils/audioUtils.ts**: PCM/WAV encoding, base64 decoding, audio concatenation
- **server/public/service-worker.js**: Service worker that intercepts Gemini API requests and rewrites to /api-proxy
- **server/server.js**: Express server with JWT-based Firebase token validation (no service account required)

## Testing Notes

The app requires valid Firebase and Gemini credentials to function. For testing:
1. Ensure both frontend and backend .env files are configured
2. Firebase authentication must be enabled in your Firebase project
3. Server must be running on `http://localhost:3000` to proxy Gemini API calls
4. Verify service worker registration in browser DevTools → Application → Service Workers
5. Check Network tab - should only see `/api-proxy/*` requests, never `generativelanguage.googleapis.com`
6. Service workers work on localhost over HTTP (no HTTPS needed for local development)
