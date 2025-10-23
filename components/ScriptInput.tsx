
import React from 'react';
import { LoadingSpinner, MagicWandIcon } from './icons';

interface ScriptInputProps {
    script: string;
    setScript: (script: string) => void;
    onExtract: () => void;
    isLoading: boolean;
}

export const ScriptInput: React.FC<ScriptInputProps> = ({ script, setScript, onExtract, isLoading }) => {
    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-slate-200 mb-4">1. Paste Your Script</h2>
            <div className="bg-slate-800 rounded-lg p-4 shadow-lg">
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Enter your movie or play script here..."
                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200 resize-y"
                    disabled={isLoading}
                />
                <button
                    onClick={onExtract}
                    disabled={isLoading || !script.trim()}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 disabled:scale-100"
                >
                    {isLoading ? (
                        <>
                            <LoadingSpinner className="w-5 h-5" />
                            Extracting Dialogue...
                        </>
                    ) : (
                        <>
                            <MagicWandIcon className="w-5 h-5" />
                            Extract Dialogue
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
