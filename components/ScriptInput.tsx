import React from 'react';
import { LoadingSpinner, MagicWandIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface ScriptInputProps {
    script: string;
    setScript: (script: string) => void;
    onExtract: () => void;
    isLoading: boolean;
}

export const ScriptInput: React.FC<ScriptInputProps> = ({ script, setScript, onExtract, isLoading }) => {
    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-foreground mb-4">1. Paste Your Script</h2>
            <Card>
                <CardContent className="p-4">
                    <Textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Enter your movie or play script here..."
                        className="min-h-64 resize-y font-mono"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={onExtract}
                        disabled={isLoading || !script.trim()}
                        className="mt-4 w-full"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <LoadingSpinner className="w-5 h-5 mr-2" />
                                Extracting Dialogue...
                            </>
                        ) : (
                            <>
                                <MagicWandIcon className="w-5 h-5 mr-2" />
                                Extract Dialogue
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
