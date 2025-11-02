/**
 * Token Manager with Automatic Refresh
 * Manages Google OAuth tokens and handles automatic token refresh
 */

let currentToken: string | null = null;
let refreshTimer: NodeJS.Timeout | null = null;

/**
 * Refresh the ID token using the refresh token
 */
async function refreshToken(): Promise<string | null> {
    // Skip token refresh in development mode (no proxy server)
    const isDevelopment = !import.meta.env.VITE_API_BASE_URL;
    if (isDevelopment) {
        console.log('[TokenManager] Skipping token refresh in development mode');
        return null;
    }

    const refreshToken = localStorage.getItem('google_refresh_token');

    if (!refreshToken) {
        console.error('[TokenManager] No refresh token available');
        return null;
    }

    try {
        console.log('[TokenManager] Refreshing token...');
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const data = await response.json();
        const { id_token, expires_in } = data;

        // Update stored token and expiry
        const expiresAt = Date.now() + (expires_in * 1000);
        localStorage.setItem('google_id_token', id_token);
        localStorage.setItem('token_expires_at', expiresAt.toString());

        console.log('[TokenManager] Token refreshed successfully, expires in', expires_in, 'seconds');

        // Update current token
        await setAuthToken(id_token);

        // Schedule next refresh (5 minutes before expiry)
        scheduleTokenRefresh(expires_in);

        return id_token;
    } catch (error) {
        console.error('[TokenManager] Failed to refresh token:', error);
        // Clear tokens and force re-login
        localStorage.removeItem('google_id_token');
        localStorage.removeItem('google_refresh_token');
        localStorage.removeItem('token_expires_at');
        localStorage.removeItem('google_user');
        return null;
    }
}

/**
 * Schedule automatic token refresh before expiry
 * @param expiresIn Token lifetime in seconds
 */
function scheduleTokenRefresh(expiresIn: number): void {
    // Clear any existing timer
    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }

    // Refresh 5 minutes before expiry (or halfway through if token is short-lived)
    const refreshBeforeExpiry = Math.min(300, Math.floor(expiresIn / 2));
    const refreshIn = (expiresIn - refreshBeforeExpiry) * 1000;

    console.log(`[TokenManager] Scheduling token refresh in ${Math.floor(refreshIn / 1000)} seconds`);

    refreshTimer = setTimeout(() => {
        refreshToken();
    }, refreshIn);
}

/**
 * Get current auth token, refreshing if necessary
 */
export async function getAuthToken(): Promise<string | null> {
    // Check if token is expired or about to expire (within 1 minute)
    const expiresAt = localStorage.getItem('token_expires_at');

    if (expiresAt) {
        const expiresAtMs = parseInt(expiresAt, 10);
        const now = Date.now();
        const timeUntilExpiry = expiresAtMs - now;

        // TESTING: Set to 5 minutes for normal use, or 50 hours to force immediate refresh for testing
        const REFRESH_THRESHOLD = 60000; // 1 minute (change to: 50 * 60 * 60 * 1000 to test refresh)

        // If token expires within threshold, refresh it
        if (timeUntilExpiry < REFRESH_THRESHOLD) {
            console.log('[TokenManager] Token expired or about to expire, refreshing...');
            const newToken = await refreshToken();
            return newToken || currentToken;
        }
    }

    return currentToken;
}

/**
 * Get current auth token synchronously (for immediate use)
 * Use getAuthToken() for async operations to ensure token is fresh
 */
export function getAuthTokenSync(): string | null {
    return currentToken;
}

export async function setAuthToken(token: string | null): Promise<void> {
    currentToken = token;

    // If setting a new token, schedule refresh based on expiry
    if (token) {
        const expiresAt = localStorage.getItem('token_expires_at');
        if (expiresAt) {
            const expiresAtMs = parseInt(expiresAt, 10);
            const now = Date.now();
            const expiresIn = Math.floor((expiresAtMs - now) / 1000);

            if (expiresIn > 0) {
                scheduleTokenRefresh(expiresIn);
            }
        }
    } else {
        // Clear refresh timer when token is cleared
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
    }
}
