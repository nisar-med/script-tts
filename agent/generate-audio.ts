#!/usr/bin/env tsx
/**
 * Audio Generation Script for Claude Agent
 *
 * This script takes dialogues and character voice assignments as input
 * and generates audio using the Gemini TTS API.
 *
 * Usage:
 *   npx tsx agent/generate-audio.ts <dialogues-json-file> <output-file>
 *   npx tsx agent/generate-audio.ts --inline '<json>' <output-file>
 *
 * Environment:
 *   API_KEY or GEMINI_API_KEY must be set (loaded from server/.env if present)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Load environment variables from server/.env if it exists
const serverEnvPath = resolve(process.cwd(), '.env');
if (existsSync(serverEnvPath)) {
  config({ path: serverEnvPath });
}

import { generateDialogueAudio } from '../services/geminiService.js';
import { decode, createWavBlob } from '../utils/audioUtils.js';

interface DialogueLine {
  character: string;
  dialogue: string;
  deliveryNote: string;
  gender: 'male' | 'female' | 'neutral';
}

interface Character {
  name: string;
  voice: string;
}

interface InputData {
  language: string;
  dialogues: DialogueLine[];
}

const MALE_VOICES = ["Puck", "Charon", "Fenrir"];
const FEMALE_VOICES = ["Kore", "Zephyr"];

function assignVoices(dialogues: DialogueLine[]): Character[] {
  // Get unique characters
  const characterMap = new Map<string, 'male' | 'female' | 'neutral'>();

  for (const line of dialogues) {
    if (!characterMap.has(line.character)) {
      characterMap.set(line.character, line.gender);
    }
  }

  const characters: Character[] = [];
  let maleIndex = 0;
  let femaleIndex = 0;

  for (const [name, gender] of characterMap.entries()) {
    if (gender === 'female') {
      characters.push({
        name,
        voice: FEMALE_VOICES[femaleIndex % FEMALE_VOICES.length]
      });
      femaleIndex++;
    } else {
      // male or neutral
      characters.push({
        name,
        voice: MALE_VOICES[maleIndex % MALE_VOICES.length]
      });
      maleIndex++;
    }
  }

  return characters;
}

function calculateDuration(pcmDataLength: number, sampleRate = 24000, bytesPerSample = 2): number {
  const numSamples = pcmDataLength / bytesPerSample;
  return numSamples / sampleRate;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx tsx generate-audio.ts <dialogues-json-file> <output-file>');
    console.error('   or: npx tsx generate-audio.ts --inline \'<json>\' <output-file>');
    process.exit(1);
  }

  let inputData: InputData;
  let outputFile: string;

  // Parse input
  if (args[0] === '--inline') {
    if (args.length < 3) {
      console.error('--inline requires JSON string and output file');
      process.exit(1);
    }
    try {
      inputData = JSON.parse(args[1]);
      outputFile = args[2];
    } catch (error) {
      console.error('Failed to parse inline JSON:', error);
      process.exit(1);
    }
  } else {
    const inputFile = resolve(args[0]);
    outputFile = args[1];

    try {
      const jsonContent = readFileSync(inputFile, 'utf-8');
      inputData = JSON.parse(jsonContent);
    } catch (error) {
      console.error('Failed to read or parse input file:', error);
      process.exit(1);
    }
  }

  // Validate input data
  if (!inputData.language || !Array.isArray(inputData.dialogues)) {
    console.error('Invalid input data structure. Required: { language: string, dialogues: array }');
    process.exit(1);
  }

  if (inputData.dialogues.length === 0) {
    console.error('No dialogues found in input data');
    process.exit(1);
  }

  console.log('📖 Processing dialogues...');
  console.log(`   Language: ${inputData.language}`);
  console.log(`   Dialogue lines: ${inputData.dialogues.length}`);

  // Assign voices
  const characters = assignVoices(inputData.dialogues);
  console.log(`   Characters: ${characters.length}`);
  console.log('\n🎭 Voice assignments:');
  for (const char of characters) {
    const gender = inputData.dialogues.find(d => d.character === char.name)?.gender || 'unknown';
    console.log(`   ${char.name} (${gender}) → ${char.voice}`);
  }

  // Generate audio
  console.log('\n🎵 Generating audio...');
  try {
    const base64Audio = await generateDialogueAudio(inputData.dialogues, characters);

    // Decode and create WAV
    const pcmData = decode(base64Audio);
    const wavBlob = createWavBlob(pcmData);
    const buffer = await wavBlob.arrayBuffer();

    // Calculate duration
    const duration = calculateDuration(pcmData.length);

    // Write to file
    const outputPath = resolve(outputFile);
    writeFileSync(outputPath, Buffer.from(buffer));

    console.log('\n✅ Audio generated successfully!');
    console.log(`   Output file: ${outputPath}`);
    console.log(`   Duration: ${duration.toFixed(2)} seconds`);
    console.log(`   Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('\n❌ Failed to generate audio:', error);
    process.exit(1);
  }
}

main();
