
import React, { useState, useEffect, useCallback } from 'react';
import type { DialogueLine, Character } from './types';
import { extractDialogueFromScript, generateDialogueAudio } from './services/geminiService';
import { decode, createWavBlob } from './utils/audioUtils';
import { MALE_VOICES, FEMALE_VOICES, SUPPORTED_LANGUAGES } from './constants';
import { ScriptInput } from './components/ScriptInput';
import { DialoguePreview } from './components/DialoguePreview';
import { AudioPlayer } from './components/AudioPlayer';

const App: React.FC = () => {
    const [script, setScript] = useState<string>('');
    const [dialogues, setDialogues] = useState<DialogueLine[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoadingExtraction, setIsLoadingExtraction] = useState<boolean>(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scriptLanguage, setScriptLanguage] = useState<string>(SUPPORTED_LANGUAGES[0].code);

    useEffect(() => {
        if (dialogues.length > 0) {
            const uniqueCharacterNames = [...new Set(dialogues.map(d => d.character))];

            const femaleChars = uniqueCharacterNames.filter(name => dialogues.find(d => d.character === name)!.gender === 'female');
            const maleChars = uniqueCharacterNames.filter(name => dialogues.find(d => d.character === name)!.gender !== 'female'); // Male and Neutral

            const buildCharacterList = (names: string[], voicePool: string[]): Character[] => {
                if (voicePool.length === 0) return []; // Avoid errors if a voice pool is empty
                return names.map((name, index) => {
                    const existingCharacter = characters.find(c => c.name === name);
                    return {
                        name,
                        voice: existingCharacter?.voice || voicePool[index % voicePool.length],
                    };
                });
            };

            const femaleCharacterList = buildCharacterList(femaleChars, FEMALE_VOICES);
            const maleCharacterList = buildCharacterList(maleChars, MALE_VOICES);

            const allCharacters = [...femaleCharacterList, ...maleCharacterList]
                // Sort characters to maintain their order of appearance from the script
                .sort((a,b) => uniqueCharacterNames.indexOf(a.name) - uniqueCharacterNames.indexOf(b.name));
            
            setCharacters(allCharacters);
        } else {
            setCharacters([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogues]);

    const handleExtractDialogue = useCallback(async () => {
        if (!script.trim()) return;
        setIsLoadingExtraction(true);
        setError(null);
        setDialogues([]);
        setAudioUrl(null);
        try {
            const { dialogues: extractedDialogues, language: detectedLanguage } = await extractDialogueFromScript(script);
            setDialogues(extractedDialogues);
            
            const supportedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === detectedLanguage);
            if (supportedLang) {
                setScriptLanguage(supportedLang.code);
            } else {
                setScriptLanguage('other'); 
            }

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoadingExtraction(false);
        }
    }, [script]);

    const handleCharacterVoiceChange = (characterName: string, voice: string) => {
        setCharacters(prev =>
            prev.map(char =>
                char.name === characterName ? { ...char, voice } : char
            )
        );
    };

    const handleDeliveryNoteChange = (index: number, note: string) => {
        setDialogues(prev => {
            const newDialogues = [...prev];
            newDialogues[index].deliveryNote = note;
            return newDialogues;
        });
    };
    
    const handleGenerateAudio = useCallback(async () => {
        if (dialogues.length === 0 || characters.length === 0) return;
        setIsLoadingAudio(true);
        setError(null);
        setAudioUrl(null);
        try {
            const base64Audio = await generateDialogueAudio(dialogues, characters);
            const pcmData = decode(base64Audio);
            const wavBlob = createWavBlob(pcmData);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred during audio generation.');
        } finally {
            setIsLoadingAudio(false);
        }
    }, [dialogues, characters]);

    const handleDownloadDialogue = useCallback(() => {
        if (dialogues.length === 0) return;

        const formattedDialogue = dialogues
            .map(line => `${line.character.toUpperCase()}:\n${line.dialogue}\n`)
            .join('\n');

        const blob = new Blob([formattedDialogue], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dialogue-script.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [dialogues]);
    
    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
            <main className="max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
                        Script to Multilingual Audio
                    </h1>
                    <p className="mt-2 text-lg text-slate-400">
                        Bring your scripts to life with AI-powered dialogue extraction and multi-speaker TTS.
                    </p>
                </header>

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                <div className="space-y-8">
                   <ScriptInput 
                        script={script}
                        setScript={setScript}
                        onExtract={handleExtractDialogue}
                        isLoading={isLoadingExtraction}
                   />
                   
                   {dialogues.length > 0 && (
                       <DialoguePreview
                           dialogues={dialogues}
                           characters={characters}
                           onCharacterVoiceChange={handleCharacterVoiceChange}
                           onDeliveryNoteChange={handleDeliveryNoteChange}
                           onGenerateAudio={handleGenerateAudio}
                           isLoading={isLoadingAudio}
                           scriptLanguage={scriptLanguage}
                           onDownloadDialogue={handleDownloadDialogue}
                       />
                   )}

                   {audioUrl && (
                       <AudioPlayer audioUrl={audioUrl} />
                   )}
                </div>
            </main>
        </div>
    );
};

export default App;