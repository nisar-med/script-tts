import React from 'react';
import { GoogleIcon, LoadingSpinner } from './icons';

interface AuthProps {
    onSignIn: () => void;
    isLoading: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onSignIn, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center text-center h-64">
                <LoadingSpinner className="w-12 h-12 text-cyan-400" />
                <p className="mt-4 text-slate-400">Initializing...</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 rounded-lg p-8 shadow-lg text-center max-w-md mx-auto mt-10">
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome!</h2>
            <p className="text-slate-400 mb-6">Please sign in to continue.</p>
            <button
                onClick={onSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 border border-gray-300 rounded-lg shadow-sm transition duration-300 transform hover:scale-105"
            >
                <GoogleIcon className="w-6 h-6" />
                Sign in with Google
            </button>
        </div>
    );
};
