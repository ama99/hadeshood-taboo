export type CardCategory =
  | 'all'
  | 'memes'
  | 'food'
  | 'everyday'
  | 'proverbs'
  | 'pop'
  | 'tech'
  | 'places'
  | 'general'
  | 'custom';

export interface TabooCard {
  id: string;
  word: string;
  forbiddenWords: string[];
  category: Exclude<CardCategory, 'all'>;
  lang: 'fa' | 'en';
}

/**
 * Normalizes Persian & English strings for accurate real-time guess matching.
 * Converts Arabic Yeh/Kaf to Persian, removes zero-width non-joiners (نیم‌فاصله),
 * diacritics, punctuation, and extra spaces.
 */
export function normalizeTextForMatch(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    // Normalize Arabic characters to standard Persian
    .replace(/ي/g, 'ی')
    .replace(/ى/g, 'ی')
    .replace(/ئ/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ؤ/g, 'و')
    .replace(/إ|أ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    // Remove zero-width non-joiner (ZWNJ / نیم‌فاصله) and spaces for fuzzy compound matching
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Remove Arabic diacritics (تشکیل)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove punctuation
    .replace(/[.,،؛:;!؟?"'«»()[\]{}\-_]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Checks if a player's typed guess matches the target word of the card.
 */
export function isGuessCorrect(guess: string, targetWord: string): boolean {
  const normGuess = normalizeTextForMatch(guess);
  const normTarget = normalizeTextForMatch(targetWord);
  if (!normGuess || !normTarget) return false;
  if (normGuess === normTarget) return true;
  // Handle common Persian spelling variations (e.g. قرمه‌سبزی vs قورمه‌سبزی)
  const altGuess = normGuess.replace(/قورمه/g, 'قرمه').replace(/طهران/g, 'تهران');
  const altTarget = normTarget.replace(/قورمه/g, 'قرمه').replace(/طهران/g, 'تهران');
  return altGuess === altTarget;
}

/**
 * Auto-detects category from Persian/English card content if no section header is present.
 */
function inferCategory(word: string, forbidden: string[], currentSection: Exclude<CardCategory, 'all'>): Exclude<CardCategory, 'all'> {
  if (currentSection !== 'general') return currentSection;
  const joined = `${word} ${forbidden.join(' ')}`;
  if (/(اینستاگرام|تیک‌تاک|فالوور|ریلز|میم|اکسپلور|وایب|کرینج|سیمپ|دلولو|ردفلگ|گرین‌فلگ|استوری|چت|ترند|نسل زد)/.test(joined)) {
    return 'memes';
  }
  if (/(کباب|خورشت|برنج|غذا|نوشیدنی|چای|قهوه|شربت|پلو|آش|شیرینی|دیزی|پیتزا|نان)/.test(joined)) {
    return 'food';
  }
  if (/(ضرب‌المثل|کنایه|کوزه|آشپز|ماست|سنگ|گنجشک|کلاغ|شتر|حلیم|پنبه)/.test(joined) || word.split(/\s+/).length >= 4) {
    return 'proverbs';
  }
  if (/(فیلم|سریال|شاعر|حافظ|سعدی|بتمن|هری پاتر|فوتبال|مسی|رونالدو|کارگردان|بازیگر)/.test(joined)) {
    return 'pop';
  }
  if (/(بازی|تاس|مهره|کامپیوتر|گوشی|هوش مصنوعی|پلی‌استیشن|مافیا|شطرنج|مودم|اینترنت)/.test(joined)) {
    return 'tech';
  }
  if (/(شهر|پایتخت|جزیره|دریا|کوه|تهران|شیراز|اصفهان|پاریس|زلزله|آسمان)/.test(joined)) {
    return 'places';
  }
  return 'general';
}

/**
 * Parses a raw Taboo cards text file following the format:
 * کلمه اصلی : کلمه ممنوع ۱, کلمه ممنوع ۲, کلمه ممنوع ۳, کلمه ممنوع ۴, کلمه ممنوع ۵، کلمه ممنوع 6
 *
 * Supports both English comma (,) and Persian comma (،), section headers (# [CATEGORY: ...]),
 * and ignores empty lines or example markers (مثال:).
 */
export function parseCardsText(rawText: string, lang: 'fa' | 'en' = 'fa'): TabooCard[] {
  const lines = rawText.replace(/^\uFEFF/, '').split(/\r?\n/);
  const cards: TabooCard[] = [];
  const seenWords = new Set<string>();
  let currentCategory: Exclude<CardCategory, 'all'> = 'general';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for category marker comment: # [CATEGORY: memes]
    const categoryMatch = line.match(/^#\s*\[CATEGORY:\s*([a-zA-Z]+)\]/i);
    if (categoryMatch) {
      const cat = categoryMatch[1].toLowerCase() as Exclude<CardCategory, 'all'>;
      currentCategory = cat;
      continue;
    }

    // Ignore regular comments or "مثال:" header lines
    if (line.startsWith('#') || line.startsWith('//') || /^مثال\s*:?\s*$/.test(line)) {
      continue;
    }

    // Strip leading "مثال:" if inline
    const cleanedLine = line.replace(/^مثال\s*:\s*/, '').trim();
    const colonIndex = cleanedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const word = cleanedLine.slice(0, colonIndex).trim();
    const rest = cleanedLine.slice(colonIndex + 1).trim();
    if (!word || !rest) continue;

    // Split by Persian comma (،), English comma (,), or semicolon (؛ / ;)
    const rawForbidden = rest
      .split(/[،,؛;]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item !== word);

    if (rawForbidden.length === 0) continue;

    // Deduplicate forbidden words while preserving order (up to 6 words)
    const uniqueForbidden = Array.from(new Set(rawForbidden)).slice(0, 6);
    const normWord = normalizeTextForMatch(word);
    if (seenWords.has(normWord)) continue;
    seenWords.add(normWord);

    const category = inferCategory(word, uniqueForbidden, currentCategory);

    cards.push({
      id: `${lang}-${cards.length + 1}-${normWord.slice(0, 12)}`,
      word,
      forbiddenWords: uniqueForbidden,
      category,
      lang,
    });
  }

  return cards;
}

/**
 * Fetches and parses the raw text file from public/cards.txt (or public/cards_en.txt) in browser environments.
 */
export async function fetchCardsFromPublic(lang: 'fa' | 'en' = 'fa'): Promise<TabooCard[]> {
  const fileName = lang === 'fa' ? './cards.txt' : './cards_en.txt';
  try {
    const response = await fetch(fileName);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileName}: ${response.status}`);
    }
    const rawText = await response.text();
    return parseCardsText(rawText, lang);
  } catch (err) {
    console.warn(`Could not load ${fileName} via fetch, using fallback cards.`, err);
    return [];
  }
}
