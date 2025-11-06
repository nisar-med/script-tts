import React, { useState, useEffect, useCallback } from 'react';
import type { DialogueLine, Character } from '@/types';
import { extractDialogueFromScript, generateDialogueAudio, AuthenticationError } from '@/services/geminiService';
import { decode, createWavBlob } from '@/utils/audioUtils';
import { MALE_VOICES, FEMALE_VOICES, SUPPORTED_LANGUAGES } from '@/constants';
import { Auth } from '@/components/Auth';
import { ScriptInput } from '@/components/ScriptInput';
import { DialoguePreview } from '@/components/DialoguePreview';
import { AudioPlayer } from '@/components/AudioPlayer';
import { LoadingSpinner } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Save, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  // Auth State from context
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { currentProject, saveCurrentProject, updateProject } = useProject();
  const navigate = useNavigate();

  // App State
  const [script, setScript] = useState<string>('');
  const [dialogues, setDialogues] = useState<DialogueLine[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoadingExtraction, setIsLoadingExtraction] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptLanguage, setScriptLanguage] = useState<string>(SUPPORTED_LANGUAGES[0].code);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load current project data when component mounts or project changes
  useEffect(() => {
    if (currentProject) {
      setScript(currentProject.script || '');
      setDialogues(currentProject.dialogues || []);
      setCharacters(currentProject.characters || []);
      setAudioUrl(currentProject.audioUrl || null);
      setScriptLanguage(currentProject.scriptLanguage || SUPPORTED_LANGUAGES[0].code);
    }
  }, [currentProject]);

  // Auth Handlers
  const handleSignIn = async () => {
    try {
      signIn();
    } catch (error) {
      console.error("Error signing in:", error);
      setError("Failed to sign in. Please try again.");
    }
  };

  // Project Handlers
  const handleSaveProject = useCallback(async () => {
    if (!currentProject) {
      setError('No project selected. Please create or open a project first.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateProject(currentProject.id, {
        script,
        dialogues,
        characters,
        audioUrl: audioUrl || undefined,
        scriptLanguage,
      });
    } catch (error) {
      console.error('Failed to save project:', error);
      setError('Failed to save project. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, script, dialogues, characters, audioUrl, scriptLanguage, updateProject]);

  useEffect(() => {
    if (dialogues.length > 0) {
      const uniqueCharacterNames = [...new Set(dialogues.map(d => d.character))];

      const femaleChars = uniqueCharacterNames.filter(name => dialogues.find(d => d.character === name)!.gender === 'female');
      const maleChars = uniqueCharacterNames.filter(name => dialogues.find(d => d.character === name)!.gender !== 'female');

      const buildCharacterList = (names: string[], voicePool: string[]): Character[] => {
        if (voicePool.length === 0) return [];
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
      if (e instanceof AuthenticationError) {
        setError(e.message);
        await signOut();
      } else {
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      }
    } finally {
      setIsLoadingExtraction(false);
    }
  }, [script, signOut]);

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
      if (e instanceof AuthenticationError) {
        setError(e.message);
        await signOut();
      } else {
        setError(e instanceof Error ? e.message : 'An unknown error occurred during audio generation.');
      }
    } finally {
      setIsLoadingAudio(false);
    }
  }, [dialogues, characters, signOut]);

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
    <div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            <strong className="font-bold">Error: </strong>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {authLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner className="w-12 h-12 text-primary" />
        </div>
      ) : user ? (
        <div className="space-y-8">
          {/* Project Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              {currentProject ? (
                <>
                  <h2 className="text-2xl font-bold">{currentProject.name}</h2>
                  {currentProject.description && (
                    <p className="text-muted-foreground mt-1">{currentProject.description}</p>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    No project selected. Create or open a project to get started.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Projects
              </Button>
              {currentProject && (
                <Button
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </div>

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
    </div>
  );
};
