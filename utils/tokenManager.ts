/**
 * Token Manager for Service Worker Communication
 * Manages Firebase auth tokens and communicates with the service worker
 */

// Extend window interface for TypeScript
declare global {
    interface Window {
        __firebaseAuthToken__: string | null;
    }
}

let currentToken: string | null = null;

/**
 * Sends the current token to the service worker
 * Waits for service worker to be ready before sending
 */
async function sendTokenToServiceWorker(token: string | null): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        console.warn('[TokenManager] Service workers not supported');
        return;
    }

    try {
        // Wait for service worker to be ready
        const registration = await navigator.serviceWorker.ready;

        // Send to active service worker
        if (registration.active) {
            registration.active.postMessage({
                type: 'SET_AUTH_TOKEN',
                token: token
            });
            console.log('[TokenManager] Sent token to service worker:', token ? 'Token set' : 'Token cleared');
        }

        // Also send to controller if available (for immediate use)
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'SET_AUTH_TOKEN',
                token: token
            });
        }
    } catch (error) {
        console.error('[TokenManager] Error sending token to service worker:', error);
    }
}

export async function setAuthToken(token: string | null): Promise<void> {
    currentToken = token;

    // Store in global variable for WebSocket interceptor
    window.__firebaseAuthToken__ = token;

    // Send token to service worker (waits for SW to be ready)
    await sendTokenToServiceWorker(token);
}

export function getAuthToken(): string | null {
    return currentToken;
}
