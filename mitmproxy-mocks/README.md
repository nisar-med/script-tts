# Mitmproxy Mock Scripts

Mock scripts for intercepting and mocking Gemini API requests during development.

## Quick Start

Run mitmproxy with both mock scripts:

```bash
mitmdump -s mitmproxy-mocks/mock_gemini_dialogue.py -s mitmproxy-mocks/mock_gemini_tts.py -p 8080
```

This starts mitmproxy on port 8080 and loads both mock scripts.

## What Gets Mocked

- **Dialogue Extraction**: `/v1beta/models/gemini-2.5-flash:generateContent`
  - Returns mock character dialogues with delivery notes
  - Supports English, Urdu, and default responses

- **TTS Streaming**: `/v1beta/models/gemini-2.5-flash-preview-tts:streamGenerateContent`
  - Returns mock audio in SSE format
  - Generates sine wave PCM audio based on text length

## Configuration

Make sure your `.env.development` has:

```env
VITE_USE_MOCK_PROXY=true
VITE_GEMINI_API_KEY=your-api-key-here
VITE_GOOGLE_CLIENT_ID=your-client-id
```

The Vite dev server will automatically proxy `/v1beta` requests to mitmproxy.
