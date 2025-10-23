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

For local development, the server needs to run over HTTPS to support the service worker. This requires a self-signed SSL certificate.

1.  **Generate SSL Certificates:**
    Navigate to the `server` directory and run the following command to generate a `key.pem` and `cert.pem` file:

    ```bash
    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/C=US/ST=CA/L=Mountain View/O=Google/OU=Test/CN=localhost"
    ```

2.  **Install Dependencies:**
    In the `server` directory, run:
    ```bash
    npm install
    ```

3.  **Run the Server:**
    ```bash
    npm run dev
    ```
    The server will be available at `https://localhost:3000`. You will need to accept the self-signed certificate in your browser.

These certificate files are included in the `server/.gitignore` and will not be checked into source control. The server is configured to fall back to HTTP if these files are not present, which is the expected behavior for the Google Cloud Run environment.
