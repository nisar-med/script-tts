/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../utils/tokenManager';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

// Check if we're using the proxy (production mode) or direct API calls (dev mode)
const USE_PROXY = !!import.meta.env.VITE_API_BASE_URL;

interface User {
    email: string;
    name: string;
    picture: string;
    sub: string;
}

interface AuthContextType {
    user: User | null;
    idToken: string | null;
    loading: boolean;
    signIn: () => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [idToken, setIdToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load saved token from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('google_id_token');
        const savedUser = localStorage.getItem('google_user');

        if (savedToken && savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);

                // Check if token is expired
                const payload = JSON.parse(atob(savedToken.split('.')[1]));
                if (payload.exp * 1000 > Date.now()) {
                    setIdToken(savedToken);
                    setUser(parsedUser);
                    setAuthToken(savedToken);
                } else {
                    // Token expired, clear storage
                    localStorage.removeItem('google_id_token');
                    localStorage.removeItem('google_user');
                }
            } catch (error) {
                console.error('[Auth] Failed to parse saved user data:', error);
                localStorage.removeItem('google_id_token');
                localStorage.removeItem('google_user');
            }
        }
        setLoading(false);
    }, []);

    // Handle OAuth callback
    useEffect(() => {
        const handleCallback = async () => {
            // Handle implicit flow (development without proxy)
            if (!USE_PROXY) {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);

                const token = params.get('id_token');
                const error = params.get('error');

                if (error) {
                    console.error('[Auth] OAuth error:', error);
                    setLoading(false);
                    return;
                }

                if (!token) return;

                try {
                    // Parse ID token to get user info
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    const userData: User = {
                        email: payload.email || '',
                        name: payload.name || '',
                        picture: payload.picture || '',
                        sub: payload.sub || '',
                    };

                    setIdToken(token);
                    setUser(userData);

                    // Save to localStorage (no refresh token in implicit flow)
                    localStorage.setItem('google_id_token', token);
                    localStorage.setItem('google_user', JSON.stringify(userData));

                    // Set token for API requests
                    setAuthToken(token);

                    console.log('[Auth] User authenticated (implicit flow):', userData.email);

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (error) {
                    console.error('[Auth] Failed to parse ID token:', error);
                }
                setLoading(false);
                return;
            }

            // Authorization code flow (USE_PROXY === true)
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const error = params.get('error');

            if (error) {
                console.error('[Auth] OAuth error:', error);
                setLoading(false);
                return;
            }

            if (code) {
                // Verify state parameter for CSRF protection
                const savedState = localStorage.getItem('auth_state');
                if (state !== savedState) {
                    console.error('[Auth] State mismatch - possible CSRF attack');
                    setLoading(false);
                    return;
                }

                try {
                    // Exchange authorization code for tokens via backend
                    const response = await fetch('/api/auth/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, redirectUri: REDIRECT_URI })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to exchange authorization code');
                    }

                    const data = await response.json();
                    const { id_token, refresh_token, expires_in } = data;

                    // Parse ID token to get user info
                    const payload = JSON.parse(atob(id_token.split('.')[1]));

                    const userData: User = {
                        email: payload.email || '',
                        name: payload.name || '',
                        picture: payload.picture || '',
                        sub: payload.sub || '',
                    };

                    setIdToken(id_token);
                    setUser(userData);

                    // Save to localStorage with expiry
                    const expiresAt = Date.now() + (expires_in * 1000);
                    localStorage.setItem('google_id_token', id_token);
                    localStorage.setItem('google_refresh_token', refresh_token);
                    localStorage.setItem('token_expires_at', expiresAt.toString());
                    localStorage.setItem('google_user', JSON.stringify(userData));
                    localStorage.removeItem('auth_state');

                    // Set token for API requests
                    setAuthToken(id_token);

                    console.log('[Auth] User authenticated:', userData.email);

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (error) {
                    console.error('[Auth] Failed to exchange code for tokens:', error);
                }
                setLoading(false);
            }
        };

        // Check for both implicit flow (hash) and authorization code flow (search params)
        if (window.location.hash.includes('id_token') || window.location.search.includes('code=')) {
            handleCallback();
        }
    }, []);

    const signIn = () => {
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('scope', 'openid profile email');

        if (USE_PROXY) {
            // Authorization code flow with refresh tokens (production)
            const state = Math.random().toString(36).substring(2);
            localStorage.setItem('auth_state', state);

            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('state', state);

            console.log('[Auth] Using authorization code flow');
        } else {
            // Implicit flow (development)
            const nonce = Math.random().toString(36).substring(2);
            localStorage.setItem('auth_nonce', nonce);

            authUrl.searchParams.set('response_type', 'id_token token');
            authUrl.searchParams.set('nonce', nonce);

            console.log('[Auth] Using implicit flow (development mode)');
        }

        // Redirect to Google
        window.location.href = authUrl.toString();
    };

    const signOut = async () => {
        setUser(null);
        setIdToken(null);
        localStorage.removeItem('google_id_token');
        localStorage.removeItem('google_refresh_token');
        localStorage.removeItem('token_expires_at');
        localStorage.removeItem('google_user');
        localStorage.removeItem('auth_state');
        localStorage.removeItem('auth_nonce');
        await setAuthToken(null);
        console.log('[Auth] User signed out');
    };

    if (!GOOGLE_CLIENT_ID) {
        console.error('[Auth] GOOGLE_CLIENT_ID not set in environment variables');
        return <div>Google Client ID not configured</div>;
    }

    const value: AuthContextType = {
        user,
        idToken,
        loading,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
