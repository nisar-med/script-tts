
export interface DialogueLine {
  character: string;
  dialogue: string;
  deliveryNote: string;
  gender: 'male' | 'female' | 'neutral';
}

export interface Character {
  name: string;
  voice: string;
}

export interface ExtractedData {
  dialogues: { character: string; dialogue: string; deliveryNote: string; gender: 'male' | 'female' | 'neutral'; }[];
  language: string; // ISO 639-1 code
}