# AI Studio Gemini App Proxy Server

This nodejs proxy server lets you run your AI Studio Gemini application unmodified, without exposing your API key in the frontend code.


## Instructions

**Prerequisites**:
- [Google Cloud SDK / gcloud CLI](https://cloud.google.com/sdk/docs/install)
- (Optional) Gemini API Key

1. Download or copy the files of your AI Studio app into this directory at the root level.
2. If your app calls the Gemini API, create a Secret for your API key:
     ```
     echo -n "${GEMINI_API_KEY}" | gcloud secrets create gemini_api_key --data-file=-
     ```

3.  Deploy to Cloud Run (optionally including API key):
    ```
    gcloud run deploy my-app --source=. --update-secrets=GEMINI_API_KEY=gemini_api_key:latest
    ```


## Local Development

The server runs on HTTP at `localhost:3000`. Service workers work on localhost over HTTP without requiring HTTPS (browsers have a special exception for localhost development).

1.  **Install Dependencies:**
    In the `server` directory, run:
    ```bash
    npm install
    ```

2.  **Set up Environment:**
    Create a `.env` file in the `server` directory with your Gemini API key:
    ```bash
    GEMINI_API_KEY=your-api-key-here
    ```

3.  **Run the Server:**
    ```bash
    npm run dev
    ```
    The server will be available at `http://localhost:3000`.

4.  **Set up Firebase:**
    Create a `.env` file in the root directory with your Firebase configuration:
    ```
    VITE_FIREBASE_API_KEY=your-firebase-api-key
    VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
    ```

The service worker will automatically intercept Gemini API requests and proxy them through the local server, keeping your API key secure. In production (Cloud Run), HTTPS is automatically provided by the platform.
