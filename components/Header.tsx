import React from 'react';
import type { User } from 'firebase/auth';

interface HeaderProps {
    user: User | null;
    onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
    return (
        <header className="text-center mb-8">
            <div className="flex justify-between items-center mb-2 min-h-[50px]">
                <div className="w-1/3"></div> {/* Spacer */}
                <div className="w-1/3 text-center">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                        Script to Multilingual Audio
                    </h1>
                </div>
                <div className="w-1/3 flex justify-end items-center">
                    {user && (
                        <div className="flex items-center gap-4">
                             <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-slate-200 truncate">{user.displayName}</p>
                                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            </div>
                            <button
                                onClick={onSignOut}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex-shrink-0"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <p className="mt-2 text-lg text-slate-400">
                Bring your scripts to life with AI-powered dialogue extraction and multi-speaker TTS.
            </p>
        </header>
    );
};
