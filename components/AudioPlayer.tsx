import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AudioPlayerProps {
    audioUrl: string | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
    if (!audioUrl) return null;

    return (
        <div className="w-full mt-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">3. Listen to Your Scene</h2>
            <Card>
                <CardContent className="pt-6">
                    <audio controls src={audioUrl} className="w-full">
                        Your browser does not support the audio element.
                    </audio>
                </CardContent>
            </Card>
        </div>
    );
};
