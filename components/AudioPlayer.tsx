
import React from 'react';

interface AudioPlayerProps {
    audioUrl: string | null;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
    if (!audioUrl) return null;

    return (
        <div className="w-full mt-8">
            <h2 className="text-2xl font-bold text-slate-200 mb-4">3. Listen to Your Scene</h2>
            <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
                <audio controls src={audioUrl} className="w-full">
                    Your browser does not support the audio element.
                </audio>
            </div>
        </div>
    );
};
