import React from 'react';
import { GoogleIcon, LoadingSpinner } from './icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthProps {
    onSignIn: () => void;
    isLoading: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onSignIn, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center text-center h-64">
                <LoadingSpinner className="w-12 h-12 text-primary" />
                <p className="mt-4 text-muted-foreground">Initializing...</p>
            </div>
        );
    }

    return (
        <Card className="max-w-md mx-auto mt-10">
            <CardHeader>
                <CardTitle className="text-2xl">Welcome!</CardTitle>
                <CardDescription>Please sign in to continue.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={onSignIn}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-3"
                    size="lg"
                >
                    <GoogleIcon className="w-5 h-5" />
                    Sign in with Google
                </Button>
            </CardContent>
        </Card>
    );
};
