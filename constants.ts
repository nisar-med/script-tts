
export const MALE_VOICES = ["Puck", "Charon", "Fenrir"];
export const FEMALE_VOICES = ["Kore", "Zephyr"];
export const ALL_AVAILABLE_VOICES = [...MALE_VOICES, ...FEMALE_VOICES].sort();


export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English (Recommended)' },
    { code: 'ur', name: 'Urdu' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'other', name: 'Other' },
];