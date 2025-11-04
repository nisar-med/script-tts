import React from 'react';
import { Button } from '@/components/ui/button';

interface User {
    email: string;
    name: string;
    picture: string;
}

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
                    <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
                        Script to Multilingual Audio
                    </h1>
                </div>
                <div className="w-1/3 flex justify-end items-center">
                    {user && (
                        <div className="flex items-center gap-4">
                             <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            <Button
                                onClick={onSignOut}
                                className="flex-shrink-0"
                            >
                                Sign Out
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <p className="mt-2 text-lg text-muted-foreground">
                Bring your scripts to life with AI-powered dialogue extraction and multi-speaker TTS.
            </p>
        </header>
    );
};
