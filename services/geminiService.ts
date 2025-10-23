import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { DialogueLine, Character, ExtractedData } from '../types';
import { decode, encode, concatenatePcmData } from "../utils/audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function extractDialogueFromScript(script: string): Promise<ExtractedData> {
  try {
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


async function generateSingleSpeakerAudio(dialogue: string, deliveryNote: string, voice: string): Promise<string | null> {
    const textToSpeak = dialogue.trim();
    // Don't call the API for empty, whitespace-only, or punctuation-only lines
    if (!textToSpeak || /^[ \t\r\n.…]+$/.test(textToSpeak)) {
        console.log(`Skipping empty or non-dialogue line: "${dialogue.substring(0, 50)}..."`);
        return null;
    }
    
    try {
        const descriptiveNote = deliveryNote.replace(/<[^>]+>/g, '').trim();
        const level = getEmphasisLevel(descriptiveNote);
        const additionalSsml = extractSsmlFromNote(deliveryNote);
        const ssml = `<speak><emphasis level="${level}">${additionalSsml} ${escapeXml(textToSpeak)}</emphasis></speak>`;

        const requestPayload = {
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ssml }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        };

        console.debug("TTS API Request (Single Speaker):", JSON.stringify(requestPayload, null, 2));

        const response = await ai.models.generateContent(requestPayload);
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            console.warn(`No audio data received from the API for dialogue: "${dialogue.substring(0, 50)}..."`);
            return null;
        }
        return base64Audio;
    } catch(e) {
        console.error(`Error during API call for dialogue: "${dialogue.substring(0, 50)}..."`, e);
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
        
        if (characterCount === 2) {
            const multiSpeakerPrompt = dialogues.map(d => {
                const descriptiveNote = d.deliveryNote.replace(/<[^>]+>/g, '').trim();
                const level = getEmphasisLevel(descriptiveNote);
                const additionalSsml = extractSsmlFromNote(d.deliveryNote);
                const ssmlLine = `<emphasis level="${level}">${additionalSsml} ${escapeXml(d.dialogue)}</emphasis>`;
                return `${d.character}: ${ssmlLine}`;
            }).join('\n');

            const speakerVoiceConfigs = uniqueCharacters.map(char => ({
                speaker: char.name,
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: char.voice }
                }
            }));

            const requestPayload = {
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: multiSpeakerPrompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        multiSpeakerVoiceConfig: {
                            speakerVoiceConfigs: speakerVoiceConfigs
                        }
                    }
                }
            };
            
            console.debug("TTS API Request (Multi-Speaker):", JSON.stringify(requestPayload, null, 2));

            const response = await ai.models.generateContent(requestPayload);

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
                throw new Error("No audio data received from the API for multi-speaker generation. The script might contain unsupported content.");
            }
            return base64Audio;
        }

        // Handles 1 or >2 characters
        const pcmChunks: Uint8Array[] = [];
        for (const line of dialogues) {
            const character = characters.find(c => c.name === line.character);
            if (!character) {
                console.warn(`Could not find voice for character: ${line.character}. Skipping line.`);
                continue;
            }
            const base64Audio = await generateSingleSpeakerAudio(line.dialogue, line.deliveryNote, character.voice);
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
        if (error instanceof Error) {
            throw error; // Re-throw the more specific error from the try block
        }
        throw new Error("An unexpected error occurred during audio generation. Please try again.");
    }
}