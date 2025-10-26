/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const path = require('path');
const WebSocket = require('ws');
const { URLSearchParams, URL } = require('url');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const externalWsBaseUrl = 'wss://generativelanguage.googleapis.com';
// Support either API key env-var variant
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

const staticPath = path.join(__dirname,'dist');
const publicPath = path.join(__dirname,'public');

const jwt = require('jsonwebtoken');

// Firebase project ID (required for token validation)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

// Certificate cache
let certificateCache = null;
let cacheExpiry = 0;

// Fetch Firebase public certificates (X.509 format)
async function fetchFirebaseCertificates() {
    const now = Date.now();

    // Return cached certificates if still valid
    if (certificateCache && now < cacheExpiry) {
        return certificateCache;
    }

    try {
        const response = await axios.get(
            'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
        );

        certificateCache = response.data;

        // Parse Cache-Control header to determine expiry
        const cacheControl = response.headers['cache-control'];
        const maxAgeMatch = cacheControl?.match(/max-age=(\d+)/);
        const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) : 3600; // Default 1 hour
        cacheExpiry = now + (maxAge * 1000);

        console.log(`Firebase certificates cached for ${maxAge} seconds`);
        return certificateCache;
    } catch (error) {
        console.error('Error fetching Firebase certificates:', error.message);
        throw new Error('Failed to fetch Firebase public keys');
    }
}

// Get signing key from Firebase certificates
async function getKey(header, callback) {
    try {
        const certificates = await fetchFirebaseCertificates();
        const certificate = certificates[header.kid];

        if (!certificate) {
            return callback(new Error(`Certificate not found for kid: ${header.kid}`));
        }

        // The certificate is in PEM format, which can be used directly by jsonwebtoken
        callback(null, certificate);
    } catch (error) {
        callback(error);
    }
}

// Middleware to verify Firebase ID token using public keys (no service account needed)
async function verifyFirebaseToken(req, res, next) {
    if (!FIREBASE_PROJECT_ID) {
        console.warn("[Auth] Firebase project ID not set, skipping token validation");
        console.warn("[Auth] Set FIREBASE_PROJECT_ID or VITE_FIREBASE_PROJECT_ID environment variable");
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error("[Auth] No authorization header provided");
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No authentication token provided',
            hint: 'Include Authorization: Bearer <token> header'
        });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Verify token using public keys
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(idToken, getKey, {
                algorithms: ['RS256'],
                audience: FIREBASE_PROJECT_ID,
                issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            }, (err, decoded) => {
                if (err) {
                    console.error("[Auth] JWT verification failed:", {
                        error: err.name,
                        message: err.message,
                        projectId: FIREBASE_PROJECT_ID
                    });
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });

        // Validate required claims
        if (!decoded.sub || typeof decoded.sub !== 'string' || decoded.sub.length === 0) {
            console.error("[Auth] Invalid subject claim in token");
            throw new Error('Invalid subject claim');
        }

        console.log(`[Auth] Token verified successfully for user: ${decoded.sub}`);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('[Auth] Token verification error:', {
            error: error.name,
            message: error.message,
            projectId: FIREBASE_PROJECT_ID
        });

        // Provide specific error messages
        let errorMessage = 'Invalid or expired authentication token';
        if (error.name === 'TokenExpiredError') {
            errorMessage = 'Authentication token has expired. Please sign in again.';
        } else if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Malformed authentication token.';
        } else if (error.message.includes('Certificate not found')) {
            errorMessage = 'Token signature verification failed.';
        }

        return res.status(401).json({
            error: 'Unauthorized',
            message: errorMessage,
            details: error.message
        });
    }
}

if (!apiKey) {
    // Only log an error, don't exit. The server will serve apps without proxy functionality
    console.error("Warning: GEMINI_API_KEY or API_KEY environment variable is not set! Proxy functionality will be disabled.");
}
else {
  console.log("API KEY FOUND (proxy will use this): " + apiKey)
}

// Limit body size to 50mb
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.set('trust proxy', 1 /* number of proxies between user and server */)

// Rate limiter for the proxy
const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Set ratelimit window at 15min (in ms)
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // no `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        console.warn(`Rate limit exceeded for IP: ${req.ip}. Path: ${req.path}`);
        res.status(options.statusCode).send(options.message);
    }
});

// Request logging middleware for debugging
app.use('/api-proxy', (req, res, next) => {
    const requestId = Math.random().toString(36).substring(7);
    req.requestId = requestId;

    console.log(`[Request ${requestId}] ${req.method} ${req.url}`, {
        ip: req.ip,
        headers: {
            authorization: req.headers.authorization ? 'Bearer <token>' : 'none',
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        }
    });

    // Log response when finished
    const originalSend = res.send;
    res.send = function(data) {
        console.log(`[Response ${requestId}] Status: ${res.statusCode}`);
        return originalSend.call(this, data);
    };

    next();
});

// Apply the rate limiter to the /api-proxy route before the main proxy logic, but allow OPTIONS requests to pass through
app.use('/api-proxy', (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    proxyLimiter(req, res, next);
});

// Apply Firebase token verification to /api-proxy
app.use('/api-proxy', (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    // Skip token verification for WebSocket upgrade requests (handled separately)
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next();
    }
    verifyFirebaseToken(req, res, next);
});

// Proxy route for Gemini API calls (HTTP)
app.use('/api-proxy', async (req, res, next) => {
    console.log(req.ip);
    // If the request is an upgrade request, it's for WebSockets, so pass to next middleware/handler
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        return next(); // Pass to the WebSocket upgrade handler
    }

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust as needed for security
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Goog-Api-Key');
        res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight response for 1 day
        return res.sendStatus(200);
    }

    if (req.body) { // Only log body if it exists
        console.log("  Request Body (from frontend):", req.body);
    }
    try {
        // Construct the target URL by taking the part of the path after /api-proxy/
        const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
        const apiUrl = `${externalApiBaseUrl}/${targetPath}`;
        console.log(`HTTP Proxy: Forwarding request to ${apiUrl}`);

        // Prepare headers for the outgoing request
        const outgoingHeaders = {};
        // Copy most headers from the incoming request
        for (const header in req.headers) {
            // Exclude host-specific headers and others that might cause issues upstream
            if (!['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions'].includes(header.toLowerCase())) {
                outgoingHeaders[header] = req.headers[header];
            }
        }

        // Set the actual API key in the appropriate header
        outgoingHeaders['X-Goog-Api-Key'] = apiKey;

        // Set Content-Type from original request if present (for relevant methods)
        if (req.headers['content-type'] && ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            outgoingHeaders['Content-Type'] = req.headers['content-type'];
        } else if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            // Default Content-Type to application/json if no content type for post/put/patch
            outgoingHeaders['Content-Type'] = 'application/json';
        }

        // For GET or DELETE requests, ensure Content-Type is NOT sent,
        // even if the client erroneously included it.
        if (['GET', 'DELETE'].includes(req.method.toUpperCase())) {
            delete outgoingHeaders['Content-Type']; // Case-sensitive common practice
            delete outgoingHeaders['content-type']; // Just in case
        }

        // Ensure 'accept' is reasonable if not set
        if (!outgoingHeaders['accept']) {
            outgoingHeaders['accept'] = '*/*';
        }


        const axiosConfig = {
            method: req.method,
            url: apiUrl,
            headers: outgoingHeaders,
            responseType: 'stream',
            validateStatus: function (status) {
                return true; // Accept any status code, we'll pipe it through
            },
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
            axiosConfig.data = req.body;
        }
        // For GET, DELETE, etc., axiosConfig.data will remain undefined,
        // and axios will not send a request body.

        const apiResponse = await axios(axiosConfig);

        // Pass through response headers from Gemini API to the client
        for (const header in apiResponse.headers) {
            res.setHeader(header, apiResponse.headers[header]);
        }
        res.status(apiResponse.status);


        apiResponse.data.on('data', (chunk) => {
            res.write(chunk);
        });

        apiResponse.data.on('end', () => {
            res.end();
        });

        apiResponse.data.on('error', (err) => {
            console.error('Error during streaming data from target API:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Proxy error during streaming from target' });
            } else {
                // If headers already sent, we can't send a JSON error, just end the response.
                res.end();
            }
        });

    } catch (error) {
        console.error('Proxy error before request to target API:', error);
        if (!res.headersSent) {
            if (error.response) {
                const errorData = {
                    status: error.response.status,
                    message: error.response.data?.error?.message || 'Proxy error from upstream API',
                    details: error.response.data?.error?.details || null
                };
                res.status(error.response.status).json(errorData);
            } else {
                res.status(500).json({ error: 'Proxy setup error', message: error.message });
            }
        }
    }
});

const webSocketInterceptorScriptTag = `<script src="/public/websocket-interceptor.js" defer></script>`;

// Prepare service worker registration script content
const serviceWorkerRegistrationScript = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load' , () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
} else {
  console.log('Service workers are not supported in this browser.');
}
</script>
`;

// Serve index.html or placeholder based on API key and file availability
app.get('/', (req, res) => {
    const placeholderPath = path.join(publicPath, 'placeholder.html');

    // Try to serve index.html
    console.log("LOG: Route '/' accessed. Attempting to serve index.html.");
    const indexPath = path.join(staticPath, 'index.html');

    fs.readFile(indexPath, 'utf8', (err, indexHtmlData) => {
        if (err) {
            // index.html not found or unreadable, serve the original placeholder
            console.log('LOG: index.html not found or unreadable. Falling back to original placeholder.');
            return res.sendFile(placeholderPath);
        }

        // If API key is not set, serve original HTML without injection
        if (!apiKey) {
          console.log("LOG: API key not set. Serving original index.html without script injections.");
          return res.sendFile(indexPath);
        }

        // index.html found and apiKey set, inject scripts
        console.log("LOG: index.html read successfully. Injecting scripts.");
        let injectedHtml = indexHtmlData;


        if (injectedHtml.includes('<head>')) {
            // Inject WebSocket interceptor first, then service worker script
            injectedHtml = injectedHtml.replace(
                '<head>',
                `<head>${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}`
            );
            console.log("LOG: Scripts injected into <head>.");
        } else {
            console.warn("WARNING: <head> tag not found in index.html. Prepending scripts to the beginning of the file as a fallback.");
            injectedHtml = `${webSocketInterceptorScriptTag}${serviceWorkerRegistrationScript}${indexHtmlData}`;
        }
        res.send(injectedHtml);
    });
});

app.get('/service-worker.js', (req, res) => {
   return res.sendFile(path.join(publicPath, 'service-worker.js'));
});

app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

// Start the server
let server;

server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
    console.log(`HTTP proxy active on /api-proxy/**`);
    console.log(`WebSocket proxy active on /api-proxy/**`);
});

// Create WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', async (request, socket, head) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const pathname = requestUrl.pathname;

    if (pathname.startsWith('/api-proxy/')) {
        if (!apiKey) {
            console.error("WebSocket proxy: API key not configured. Closing connection.");
            socket.destroy();
            return;
        }

        // Verify Firebase token for WebSocket connections
        if (FIREBASE_PROJECT_ID) {
            const token = requestUrl.searchParams.get('token');
            if (!token) {
                console.error("WebSocket proxy: No token provided in query params");
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            try {
                // Verify token using public keys
                await new Promise((resolve, reject) => {
                    jwt.verify(token, getKey, {
                        algorithms: ['RS256'],
                        audience: FIREBASE_PROJECT_ID,
                        issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
                    }, (err, decoded) => {
                        if (err) reject(err);
                        else if (!decoded.sub || typeof decoded.sub !== 'string' || decoded.sub.length === 0) {
                            reject(new Error('Invalid subject claim'));
                        } else {
                            resolve(decoded);
                        }
                    });
                });
                console.log("WebSocket: Firebase token verified successfully");
            } catch (error) {
                console.error("WebSocket proxy: Invalid Firebase token:", error.message);
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(request, socket, head, (clientWs) => {
            console.log('Client WebSocket connected to proxy for path:', pathname);

            const targetPathSegment = pathname.substring('/api-proxy'.length);
            const clientQuery = new URLSearchParams(requestUrl.search);
            // Remove token param (used for auth) before forwarding to Gemini
            clientQuery.delete('token');
            clientQuery.set('key', apiKey);
            const targetGeminiWsUrl = `${externalWsBaseUrl}${targetPathSegment}?${clientQuery.toString()}`;
            console.log(`Attempting to connect to target WebSocket: ${targetGeminiWsUrl}`);

            const geminiWs = new WebSocket(targetGeminiWsUrl, {
                protocol: request.headers['sec-websocket-protocol'],
            });

            const messageQueue = [];

            geminiWs.on('open', () => {
                console.log('Proxy connected to Gemini WebSocket');
                // Send any queued messages
                while (messageQueue.length > 0) {
                    const message = messageQueue.shift();
                    if (geminiWs.readyState === WebSocket.OPEN) {
                        // console.log('Sending queued message from client -> Gemini');
                        geminiWs.send(message);
                    } else {
                        // Should not happen if we are in 'open' event, but good for safety
                        console.warn('Gemini WebSocket not open when trying to send queued message. Re-queuing.');
                        messageQueue.unshift(message); // Add it back to the front
                        break; // Stop processing queue for now
                    }
                }
            });

            geminiWs.on('message', (message) => {
                // console.log('Message from Gemini -> client');
                if (clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(message);
                }
            });

            geminiWs.on('close', (code, reason) => {
                console.log(`Gemini WebSocket closed: ${code} ${reason.toString()}`);
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
                    clientWs.close(code, reason.toString());
                }
            });

            geminiWs.on('error', (error) => {
                console.error('Error on Gemini WebSocket connection:', error);
                if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
                    clientWs.close(1011, 'Upstream WebSocket error');
                }
            });

            clientWs.on('message', (message) => {
                if (geminiWs.readyState === WebSocket.OPEN) {
                    // console.log('Message from client -> Gemini');
                    geminiWs.send(message);
                } else if (geminiWs.readyState === WebSocket.CONNECTING) {
                    // console.log('Queueing message from client -> Gemini (Gemini still connecting)');
                    messageQueue.push(message);
                } else {
                    console.warn('Client sent message but Gemini WebSocket is not open or connecting. Message dropped.');
                }
            });

            clientWs.on('close', (code, reason) => {
                console.log(`Client WebSocket closed: ${code} ${reason.toString()}`);
                if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
                    geminiWs.close(code, reason.toString());
                }
            });

            clientWs.on('error', (error) => {
                console.error('Error on client WebSocket connection:', error);
                if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING) {
                    geminiWs.close(1011, 'Client WebSocket error');
                }
            });
        });
    } else {
        console.log(`WebSocket upgrade request for non-proxy path: ${pathname}. Closing connection.`);
        socket.destroy();
    }
});
