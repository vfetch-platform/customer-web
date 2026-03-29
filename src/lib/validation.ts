import {
  DESCRIPTION_HARD_MIN_WORDS,
  DESCRIPTION_HARD_MIN_CHARS,
  DESCRIPTION_SOFT_MIN_WORDS,
  DESCRIPTION_SOFT_MIN_CHARS,
  COLOR_WORDS,
  LOCATION_WORDS,
  BRAND_EXCLUDED_WORDS,
} from '@/constants/search';
import {
  BRAND_KEYWORD_REGEX,
  SIZE_MODEL_REGEX,
  CAPITALIZED_WORD_REGEX,
} from '@/constants/regex';

export const getWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export const isBelowHardMin = (text: string) =>
  getWordCount(text) < DESCRIPTION_HARD_MIN_WORDS || text.trim().length < DESCRIPTION_HARD_MIN_CHARS;

export const isBelowSoftMin = (text: string) =>
  getWordCount(text) < DESCRIPTION_SOFT_MIN_WORDS || text.trim().length < DESCRIPTION_SOFT_MIN_CHARS;

export const getMissingSuggestions = (text: string): string[] => {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const suggestions: string[] = [];

  if (!words.some(w => COLOR_WORDS.has(w))) {
    suggestions.push('+ Add a colour');
  }
  const capitalizedWords = text.match(new RegExp(CAPITALIZED_WORD_REGEX, 'g')) || [];
  const hasBrand = capitalizedWords.some(w => {
    const lw = w.toLowerCase();
    return !COLOR_WORDS.has(lw) && !BRAND_EXCLUDED_WORDS.has(lw);
  }) || BRAND_KEYWORD_REGEX.test(text);
  if (!hasBrand) {
    suggestions.push('+ Add brand or make');
  }
  if (!SIZE_MODEL_REGEX.test(text)) {
    suggestions.push('+ Add size or model');
  }
  if (!words.some(w => LOCATION_WORDS.has(w))) {
    suggestions.push('+ Where you last saw it');
  }
  return suggestions;
};
