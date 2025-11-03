import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { DialogueLine, Character, ExtractedData } from '../types';
import { decode, encode, concatenatePcmData } from "../utils/audioUtils";
import { getAuthToken } from '../utils/tokenManager';

// Custom error class for authentication failures
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Configuration based on environment
const useProxy = import.meta.env.VITE_API_BASE_URL;
const useMockProxy = import.meta.env.VITE_USE_MOCK_PROXY === 'true';

// Determine the base URL for API calls
let apiBaseUrl: string | undefined;
if (useProxy) {
  // Production mode: use backend proxy
  apiBaseUrl = `${window.location.origin}${import.meta.env.VITE_API_BASE_URL}`;
} else if (useMockProxy) {
  // Development mode with mock proxy: use relative URLs (Vite will proxy to mitmproxy)
  apiBaseUrl = `${window.location.origin}`;
}

// Function to get SDK instance with current auth token
async function getGeminiClient() {
  const token = await getAuthToken();

  return new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'placeholder',
    httpOptions: apiBaseUrl ? {
      baseUrl: apiBaseUrl,
      headers: token ? {
        'Authorization': `Bearer ${token}`
      } : undefined
    } : undefined
  });
}

/**
 * Check if error is an authentication error (401 Unauthorized)
 */
function isAuthenticationError(error: any): boolean {
  return (
    error?.message?.includes('Unauthorized') ||
    error?.message?.includes('expired') ||
    error?.message?.includes('Authentication') ||
    error?.status === 401 ||
    error?.response?.status === 401
  );
}

export async function extractDialogueFromScript(script: string): Promise<ExtractedData> {
  try {
    // Get fresh client instance with current auth token
    const ai = await getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following script. Perform four tasks:
1. Identify the primary language of the script and return its two-letter ISO 639-1 code (e.g., "en" for English, "ur" for Urdu). If not clear, default to "other".
2. Extract all character dialogue, ignoring scene headings, action descriptions, etc.
3. For each line of dialogue, determine the character's likely gender ("male", "female", or "neutral") based on their name and context.
4. For each line, suggest a brief delivery note to guide TTS generation (e.g., "(sadly)", "(shouting)").

Return a single valid JSON object with two keys: "language" (a string for the language code) and "dialogues" (an array of objects, where each object has "character", "dialogue", "deliveryNote", and "gender" keys).

SCRIPT:
${script}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: {
              type: Type.STRING,
              description: 'The detected two-letter ISO 639-1 language code of the script.',
            },
            dialogues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  character: {
                    type: Type.STRING,
                    description: 'The name of the character speaking.',
                  },
                  dialogue: {
                    type: Type.STRING,
                    description: 'The line of dialogue spoken by the character.',
                  },
                  deliveryNote: {
                    type: Type.STRING,
                    description: 'A suggested delivery note for the TTS model, e.g., "(shouting)", "(whispering)".'
                  },
                  gender: {
                    type: Type.STRING,
                    description: 'The detected gender of the character: "male", "female", or "neutral".'
                  }
                },
                required: ["character", "dialogue", "deliveryNote", "gender"],
              },
            },
          },
          required: ["language", "dialogues"],
        },
      },
    });

    const jsonString = response.text.trim();
    const extractedData = JSON.parse(jsonString);
     if (!extractedData.language || !Array.isArray(extractedData.dialogues)) {
        throw new Error("Invalid data structure received from API.");
    }
    return extractedData;
  } catch (error) {
    console.error("Error extracting dialogue:", error);

    // Check if this is an authentication error
    if (isAuthenticationError(error)) {
      throw new AuthenticationError("Your session has expired. Please sign in again.");
    }

    throw new Error("Failed to extract dialogue and detect language from the script. Please check the script format or try again.");
  }
}

function getEmphasisLevel(note: string): 'strong' | 'moderate' | 'reduced' {
    const lowerNote = note.toLowerCase();
    if (/\b(shout|yell|loud|angry|excited|emphatic|strong)\b/.test(lowerNote)) {
        return 'strong';
    }
    if (/\b(whisper|sad|soft|quiet|sigh|reduced)\b/.test(lowerNote)) {
        return 'reduced';
    }
    return 'moderate';
}

function extractSsmlFromNote(note: string): string {
    // A simple regex to find SSML-like tags. This is not a full validator.
    const ssmlTags = note.match(/<[^>]+>/g) || [];
    return ssmlTags.join(' ');
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}


async function generateSingleSpeakerAudio(dialogues: string[], deliveryNotes: string[], voice: string): Promise<string | null> {
    // Filter out empty lines
    const validIndices = dialogues
        .map((dialogue, index) => ({ dialogue: dialogue.trim(), index }))
        .filter(({ dialogue }) => dialogue && !/^[ \t\r\n.…]+$/.test(dialogue))
        .map(({ index }) => index);

    if (validIndices.length === 0) {
        console.log('Skipping batch: all lines are empty or non-dialogue');
        return null;
    }

    try {
        // Build combined SSML for all lines in the batch
        const ssmlLines = validIndices.map(i => {
            const textToSpeak = dialogues[i].trim();
            const descriptiveNote = deliveryNotes[i].replace(/<[^>]+>/g, '').trim();
            const level = getEmphasisLevel(descriptiveNote);
            const additionalSsml = extractSsmlFromNote(deliveryNotes[i]);
            return `<emphasis level="${level}">${additionalSsml} ${escapeXml(textToSpeak)}</emphasis>`;
        }).join(' ');

        const ssml = `<speak>${ssmlLines}</speak>`;

        const requestPayload = {
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ role: "user", parts: [{ text: ssml }] }],
            config: {
                temperature: 0,
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        };

        console.debug(`TTS API Request (Batched ${validIndices.length} lines):`, JSON.stringify(requestPayload, null, 2));

        // Get fresh client instance with current auth token
        const ai = await getGeminiClient();
        const response = await ai.models.generateContentStream(requestPayload);

        // Collect all audio chunks from the stream
        let base64Audio = '';
        for await (const chunk of response) {
            const audioData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                base64Audio += audioData;
            }
        }

        if (!base64Audio) {
            console.warn(`No audio data received from the API for batched request`);
            return null;
        }
        return base64Audio;
    } catch(e) {
        console.error(`Error during API call for batched request`, e);

        // Check if this is an authentication error - re-throw to be caught by caller
        if (isAuthenticationError(e)) {
            throw new AuthenticationError("Your session has expired. Please sign in again.");
        }

        return null;
    }
}

export async function generateDialogueAudio(dialogues: DialogueLine[], characters: Character[]): Promise<string> {
    try {
        const uniqueCharacters = characters.filter((char, index, self) =>
            index === self.findIndex((c) => c.name === char.name)
        );

        const characterCount = uniqueCharacters.length;

        if (characterCount === 0) {
            return "";
        }

        // Batch consecutive lines by the same character to reduce API calls
        const pcmChunks: Uint8Array[] = [];
        const batches: { character: Character; dialogues: string[]; deliveryNotes: string[] }[] = [];

        // Group consecutive lines by character
        for (const line of dialogues) {
            const character = characters.find(c => c.name === line.character);
            if (!character) {
                console.warn(`Could not find voice for character: ${line.character}. Skipping line.`);
                continue;
            }

            const lastBatch = batches[batches.length - 1];
            if (lastBatch && lastBatch.character.name === character.name) {
                // Add to existing batch
                lastBatch.dialogues.push(line.dialogue);
                lastBatch.deliveryNotes.push(line.deliveryNote);
            } else {
                // Start new batch
                batches.push({
                    character,
                    dialogues: [line.dialogue],
                    deliveryNotes: [line.deliveryNote]
                });
            }
        }

        console.log(`Processing ${dialogues.length} lines in ${batches.length} batched requests`);

        // Generate audio for each batch
        for (const batch of batches) {
            const base64Audio = await generateSingleSpeakerAudio(
                batch.dialogues,
                batch.deliveryNotes,
                batch.character.voice
            );
            if (base64Audio) {
                pcmChunks.push(decode(base64Audio));
            }
        }

        if (pcmChunks.length === 0) {
            throw new Error("Audio generation failed for all dialogue lines. Please check if the script's language is supported by the selected voices.");
        }

        const concatenatedPcm = concatenatePcmData(pcmChunks);
        return encode(concatenatedPcm);

    } catch (error) {
        console.error("Error generating audio:", error);

        // Check if this is an authentication error
        if (isAuthenticationError(error)) {
            throw new AuthenticationError("Your session has expired. Please sign in again.");
        }

        if (error instanceof Error) {
            throw error; // Re-throw the more specific error from the try block
        }
        throw new Error("An unexpected error occurred during audio generation. Please try again.");
    }
}