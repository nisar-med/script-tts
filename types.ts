
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

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  script?: string;
  dialogues?: DialogueLine[];
  characters?: Character[];
  audioUrl?: string;
  scriptLanguage?: string;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  hasScript: boolean;
  hasDialogues: boolean;
  hasAudio: boolean;
}