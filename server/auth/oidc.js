/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

// Google OIDC configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Certificate cache
let certificateCache = null;
let cacheExpiry = 0;

/**
 * Fetch Google's public certificates for ID token verification
 */
async function fetchGoogleCertificates() {
    const now = Date.now();

    // Return cached certificates if still valid
    if (certificateCache && now < cacheExpiry) {
        return certificateCache;
    }

    try {
        const response = await axios.get(
            'https://www.googleapis.com/oauth2/v3/certs'
        );

        certificateCache = response.data.keys;

        // Cache for 1 hour (Google rotates these periodically)
        cacheExpiry = now + (3600 * 1000);

        console.log('[OIDC] Google certificates cached');
        return certificateCache;
    } catch (error) {
        console.error('[OIDC] Error fetching Google certificates:', error.message);
        throw new Error('Failed to fetch Google public keys');
    }
}

/**
 * Get signing key from Google certificates using kid (key ID)
 */
async function getKey(header, callback) {
    try {
        const keys = await fetchGoogleCertificates();
        const key = keys.find(k => k.kid === header.kid);

        if (!key) {
            return callback(new Error(`Certificate not found for kid: ${header.kid}`));
        }

        // Convert JWK to PEM format
        const jwkToPem = require('jwk-to-pem');
        const pem = jwkToPem(key);
        callback(null, pem);
    } catch (error) {
        callback(error);
    }
}

/**
 * Verify Google ID token
 */
async function verifyIdToken(idToken) {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    try {
        // Verify token using Google's public keys
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(idToken, getKey, {
                algorithms: ['RS256'],
                audience: GOOGLE_CLIENT_ID,
                issuer: ['https://accounts.google.com', 'accounts.google.com'],
            }, (err, decoded) => {
                if (err) {
                    console.error('[OIDC] JWT verification failed:', err.message);
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });

        // Validate required claims
        if (!decoded.sub || typeof decoded.sub !== 'string' || decoded.sub.length === 0) {
            throw new Error('Invalid subject claim in ID token');
        }

        if (!decoded.email) {
            throw new Error('Email claim missing from ID token');
        }

        console.log(`[OIDC] Token verified successfully for user: ${decoded.email} (${decoded.sub})`);

        return {
            sub: decoded.sub,
            email: decoded.email,
            email_verified: decoded.email_verified,
            name: decoded.name,
            picture: decoded.picture,
            iat: decoded.iat,
            exp: decoded.exp,
        };
    } catch (error) {
        console.error('[OIDC] Token verification failed:', error.message);
        throw error;
    }
}

/**
 * Middleware to verify Google ID token from Authorization header
 */
async function verifyGoogleToken(req, res, next) {
    if (!GOOGLE_CLIENT_ID) {
        console.warn('[OIDC] Google Client ID not set, skipping token validation');
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('[OIDC] No authorization header provided');
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'No authentication token provided',
            hint: 'Include Authorization: Bearer <token> header'
        });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const claims = await verifyIdToken(idToken);
        req.user = claims;
        next();
    } catch (error) {
        console.error('[OIDC] Token verification error:', error.message);

        let errorMessage = 'Invalid or expired authentication token';
        if (error.message.includes('expired')) {
            errorMessage = 'Authentication token has expired. Please sign in again.';
        } else if (error.message.includes('Invalid')) {
            errorMessage = 'Malformed authentication token.';
        }

        return res.status(401).json({
            error: 'Unauthorized',
            message: errorMessage,
            details: error.message
        });
    }
}

module.exports = {
    verifyIdToken,
    verifyGoogleToken,
};
