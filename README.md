# Script to Multilingual Audio

A text-to-speech application that converts movie/theatre scripts into multi-character audio using Google's Gemini AI.

## Quick Start

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Environment Variables

Use `.env.example` as a template to create environment-specific files:

**Frontend Development** (`.env.development`):
```bash
cp .env.example .env.development
# Edit and set your actual values:
# VITE_GEMINI_API_KEY=your-gemini-api-key
# VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

**Frontend Production** (`.env.production`):
```bash
cp .env.example .env.production
# Edit and set your actual values:
# VITE_API_BASE_URL=/api-proxy
# VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

**Backend** (`server/.env`):
```bash
# Create server/.env with:
# GEMINI_API_KEY=your-gemini-api-key
# GOOGLE_CLIENT_ID=your-google-oauth-client-id
# PORT=3000
```

### 3. Development Mode

```bash
# Run frontend only (calls Gemini API directly)
npm run dev
```

Visit `http://localhost:5173`

### 4. Production Mode

```bash
# Build frontend
npm run build

# Start server (from server directory)
cd server
npm start
```

Visit `http://localhost:3000`

## How It Works

### Development vs Production

- **Development**: Frontend calls Gemini API directly using your API key from `.env.development`
- **Production**: All API calls are routed through `/api-proxy` server endpoint (API key stays server-side)

### Architecture

1. User authenticates with Google OAuth
2. User pastes a script → Gemini extracts dialogue, detects character genders
3. User assigns voices to characters
4. Gemini generates audio with different voices per character
5. Audio is concatenated and available for playback/download

## Features

- Multi-character dialogue extraction with gender detection
- Voice assignment (5 prebuilt voices: Puck, Charon, Fenrir, Kore, Zephyr)
- Delivery note detection for expressive speech
- Batch processing for consecutive lines by the same character
- WAV audio output

## Deployment to Google Cloud Run

Deploy using Cloud Build with substitution variables:

```bash
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_GEMINI_API_KEY="your-gemini-key",_VITE_GOOGLE_CLIENT_ID="your-client-id"
```

Or set up a Cloud Build trigger with these substitution variables:
- `_GEMINI_API_KEY`: Your Gemini API key
- `_VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID

## Documentation

- [.specify/memory/constitution.md](.specify/memory/constitution.md) - Project constitution and core principles
- [CLAUDE.md](CLAUDE.md) - Complete technical documentation for development
- [types.ts](types.ts) - TypeScript interfaces
- [constants.ts](constants.ts) - Voice and language configurations
