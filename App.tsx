import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase/config';
import type { DialogueLine, Character } from './types';
import { extractDialogueFromScript, generateDialogueAudio } from './services/geminiService';
import { decode, createWavBlob } from './utils/audioUtils';
import { MALE_VOICES, FEMALE_VOICES, SUPPORTED_LANGUAGES } from './constants';
import { Header } from './components/Header';
import { Auth } from './components/Auth';
import { ScriptInput } from './components/ScriptInput';
import { DialoguePreview } from './components/DialoguePreview';
import { AudioPlayer } from './components/AudioPlayer';
import { LoadingSpinner } from './components/icons';

const App: React.FC = () => {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(true);

    // App State
    const [script, setScript] = useState<string>('');
    const [dialogues, setDialogues] = useState<DialogueLine[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoadingExtraction, setIsLoadingExtraction] = useState<boolean>(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scriptLanguage, setScriptLanguage] = useState<string>(SUPPORTED_LANGUAGES[0].code);

    // Auth Listener
    useEffect(() => {
        if (!auth) {
            setAuthLoading(false);
            return;
        };
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    // Auth Handlers
    const handleSignIn = async () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in:", error);
            setError("Failed to sign in. Please try again.");
        }
    };

    const handleSignOut = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            // Reset app state on sign out for a clean slate
            setScript('');
            setDialogues([]);
            setAudioUrl(null);
            setError(null);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };


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
    
    if (!isFirebaseConfigured) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-200 flex items-center justify-center p-4">
                <div className="bg-red-900/50 border border-red-700 text-red-300 px-6 py-4 rounded-lg max-w-lg text-center shadow-lg">
                    <h2 className="text-xl font-bold mb-2">Firebase Not Configured</h2>
                    <p>Authentication is disabled because Firebase credentials are missing. Please follow these steps:</p>
                    <ol className="list-decimal list-inside text-left mt-4 space-y-2">
                        <li>Create a <code className="bg-slate-700 p-1 rounded font-mono">.env</code> file in the root of your project.</li>
                        <li>Add your Firebase project configuration to the <code className="bg-slate-700 p-1 rounded font-mono">.env</code> file. You can copy the format from <code className="bg-slate-700 p-1 rounded font-mono">.env.example</code>.</li>
                        <li>Restart your development server.</li>
                    </ol>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
            <main className="max-w-4xl mx-auto">
                <Header user={user} onSignOut={handleSignOut} />

                {error && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                
                {authLoading ? (
                     <div className="flex items-center justify-center h-64">
                        <LoadingSpinner className="w-12 h-12 text-cyan-400" />
                    </div>
                ) : user ? (
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
                ) : (
                    <Auth onSignIn={handleSignIn} isLoading={authLoading} />
                )}
            </main>
        </div>
    );
};

export default App;