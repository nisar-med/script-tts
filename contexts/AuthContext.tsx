/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAuthToken } from '../utils/tokenManager';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

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
        const handleCallback = () => {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);

            const token = params.get('id_token');
            const error = params.get('error');

            if (error) {
                console.error('[Auth] OAuth error:', error);
                setLoading(false);
                return;
            }

            if (token) {
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

                    // Save to localStorage
                    localStorage.setItem('google_id_token', token);
                    localStorage.setItem('google_user', JSON.stringify(userData));

                    // Set token for API requests
                    setAuthToken(token);

                    console.log('[Auth] User authenticated:', userData.email);

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                } catch (error) {
                    console.error('[Auth] Failed to parse ID token:', error);
                }
                setLoading(false);
            }
        };

        if (window.location.hash.includes('id_token')) {
            handleCallback();
        }
    }, []);

    const signIn = () => {
        // Generate nonce for security
        const nonce = Math.random().toString(36).substring(2);
        localStorage.setItem('auth_nonce', nonce);

        // Build authorization URL using hybrid flow
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('response_type', 'id_token token'); // Hybrid flow: get both tokens
        authUrl.searchParams.set('scope', 'openid profile email');
        authUrl.searchParams.set('nonce', nonce);

        // Redirect to Google
        window.location.href = authUrl.toString();
    };

    const signOut = async () => {
        setUser(null);
        setIdToken(null);
        localStorage.removeItem('google_id_token');
        localStorage.removeItem('google_user');
        localStorage.removeItem('auth_nonce');
        await setAuthToken(null);
        console.log('[Auth] User signed out');
    };

    if (!GOOGLE_CLIENT_ID) {
        console.error('[Auth] VITE_GOOGLE_CLIENT_ID not set in environment variables');
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
