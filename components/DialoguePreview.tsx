import React from 'react';
import type { DialogueLine, Character } from '../types';
import { ALL_AVAILABLE_VOICES, SUPPORTED_LANGUAGES } from '../constants';
import { LoadingSpinner, AudioWaveIcon, InfoIcon, DownloadIcon } from './icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface DialoguePreviewProps {
    dialogues: DialogueLine[];
    characters: Character[];
    onCharacterVoiceChange: (characterName: string, voice: string) => void;
    onDeliveryNoteChange: (index: number, note: string) => void;
    onGenerateAudio: () => void;
    isLoading: boolean;
    scriptLanguage: string;
    onDownloadDialogue: () => void;
}

export const DialoguePreview: React.FC<DialoguePreviewProps> = ({
    dialogues,
    characters,
    onCharacterVoiceChange,
    onDeliveryNoteChange,
    onGenerateAudio,
    isLoading,
    scriptLanguage,
    onDownloadDialogue
}) => {
    const selectedLanguageName = SUPPORTED_LANGUAGES.find(lang => lang.code === scriptLanguage)?.name.replace(' (Recommended)', '') || 'Other';

    return (
        <div className="w-full mt-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">2. Review Dialogue & Assign Voices</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-lg">Extracted Dialogue</CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onDownloadDialogue}
                            title="Download Dialogue (.txt)"
                            disabled={dialogues.length === 0}
                        >
                            <DownloadIcon className="w-5 h-5" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[28rem] overflow-y-auto space-y-3 pr-2">
                            {dialogues.map((line, index) => (
                                <div key={index} className="bg-muted/50 p-3 rounded-md space-y-2">
                                    <p className="font-bold">{line.character}:</p>
                                    <p className="text-muted-foreground italic">"{line.dialogue}"</p>
                                    <Input
                                        type="text"
                                        placeholder='e.g. (shouting) or <break time="0.5s" />'
                                        value={line.deliveryNote}
                                        onChange={(e) => onDeliveryNoteChange(index, e.target.value)}
                                        className="text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Detected Language</Label>
                            <Badge variant="secondary" className="w-full justify-center py-2">
                                {selectedLanguageName}
                            </Badge>
                        </div>

                        {scriptLanguage !== 'en' && (
                            <Alert className="bg-warning/10 border-warning/50 text-warning-foreground">
                                <InfoIcon className="w-4 h-4 text-warning" />
                                <AlertDescription className="text-sm">
                                    <strong>Warning:</strong> The available voices are optimized for English. Audio generation for <strong>{selectedLanguageName}</strong> may have low quality or fail entirely.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="border-t pt-4 space-y-4">
                            <h3 className="font-semibold">Character Voices</h3>
                            {characters.map((char) => (
                                <div key={char.name} className="space-y-2">
                                    <Label htmlFor={`voice-${char.name}`}>{char.name}</Label>
                                    <Select
                                        value={char.voice}
                                        onValueChange={(voice) => onCharacterVoiceChange(char.name, voice)}
                                    >
                                        <SelectTrigger id={`voice-${char.name}`}>
                                            <SelectValue placeholder="Select voice" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ALL_AVAILABLE_VOICES.map(voice => (
                                                <SelectItem key={voice} value={voice}>{voice}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Button
                onClick={onGenerateAudio}
                disabled={isLoading || dialogues.length === 0}
                className="mt-6 w-full"
                size="lg"
                variant="default"
            >
                {isLoading ? (
                    <>
                        <LoadingSpinner className="w-5 h-5 mr-2" />
                        Generating Audio...
                    </>
                ) : (
                    <>
                        <AudioWaveIcon className="w-5 h-5 mr-2" />
                        Generate Audio
                    </>
                )}
            </Button>
        </div>
    );
};
