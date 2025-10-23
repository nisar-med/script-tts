import React from 'react';
import type { DialogueLine, Character } from '../types';
import { ALL_AVAILABLE_VOICES, SUPPORTED_LANGUAGES } from '../constants';
import { LoadingSpinner, AudioWaveIcon, InfoIcon, DownloadIcon } from './icons';

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

export const DialoguePreview: React.FC<DialoguePreviewProps> = ({ dialogues, characters, onCharacterVoiceChange, onDeliveryNoteChange, onGenerateAudio, isLoading, scriptLanguage, onDownloadDialogue }) => {
    const selectedLanguageName = SUPPORTED_LANGUAGES.find(lang => lang.code === scriptLanguage)?.name.replace(' (Recommended)', '') || 'Other';
    
    return (
        <div className="w-full mt-8">
            <h2 className="text-2xl font-bold text-slate-200 mb-4">2. Review Dialogue & Assign Voices</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-800 rounded-lg p-4 shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-cyan-400">Extracted Dialogue</h3>
                        <button 
                            onClick={onDownloadDialogue}
                            title="Download Dialogue (.txt)"
                            className="text-slate-400 hover:text-cyan-400 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={dialogues.length === 0}
                        >
                            <DownloadIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="max-h-[28rem] overflow-y-auto space-y-3 pr-2">
                        {dialogues.map((line, index) => (
                            <div key={index} className="bg-slate-900/50 p-3 rounded-md">
                                <p className="font-bold text-slate-300">{line.character}:</p>
                                <p className="text-slate-400 italic">"{line.dialogue}"</p>
                                <input
                                    type="text"
                                    placeholder='e.g. (shouting) or <break time="0.5s" />'
                                    value={line.deliveryNote}
                                    onChange={(e) => onDeliveryNoteChange(index, e.target.value)}
                                    className="mt-2 w-full bg-slate-700/50 border border-slate-700 rounded-md p-1.5 text-sm text-slate-300 placeholder-slate-500 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
                     <h3 className="text-lg font-semibold text-cyan-400 mb-3">Configuration</h3>
                     
                     <div className="mb-4">
                        <p className="block text-sm font-medium text-slate-300 mb-1">Detected Language</p>
                        <div className="w-full bg-slate-700 border border-slate-600 rounded-md p-2">
                             <p className="text-slate-200">{selectedLanguageName}</p>
                        </div>
                     </div>

                    {scriptLanguage !== 'en' && (
                        <div className="flex items-start gap-2 bg-yellow-900/50 border border-yellow-700 text-yellow-300 p-3 rounded-md mb-4">
                            <InfoIcon className="w-8 h-8 sm:w-5 sm:h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">
                                <strong>Warning:</strong> The available voices are optimized for English. Audio generation for <strong>{selectedLanguageName}</strong> may have low quality or fail entirely.
                            </p>
                        </div>
                    )}

                     <h3 className="text-lg font-semibold text-cyan-400 mb-3 mt-4 border-t border-slate-700 pt-4">Character Voices</h3>
                     <div className="space-y-4">
                        {characters.map((char) => (
                            <div key={char.name}>
                                <label htmlFor={`voice-${char.name}`} className="block text-sm font-medium text-slate-300 mb-1">{char.name}</label>
                                <select
                                    id={`voice-${char.name}`}
                                    value={char.voice}
                                    onChange={(e) => onCharacterVoiceChange(char.name, e.target.value)}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200"
                                >
                                    {ALL_AVAILABLE_VOICES.map(voice => (
                                        <option key={voice} value={voice}>{voice}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
             <button
                    onClick={onGenerateAudio}
                    disabled={isLoading || dialogues.length === 0}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 disabled:scale-100"
                >
                    {isLoading ? (
                        <>
                            <LoadingSpinner className="w-5 h-5" />
                            Generating Audio...
                        </>
                    ) : (
                        <>
                            <AudioWaveIcon className="w-5 h-5" />
                            Generate Audio
                        </>
                    )}
            </button>
        </div>
    );
};