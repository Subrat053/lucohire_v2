import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authAPI, translationAPI, userAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useLocale } from './LocaleContext';
const DEFAULT_LANGUAGE = 'en';
const RTL_LANGUAGES = new Set(['ar', 'ur', 'fa', 'he']);

export const SUPPORTED_LANGUAGES = [
  {
    "code": "en",
    "label": "English"
  },
  {
    "code": "ab",
    "label": "Abkhaz"
  },
  {
    "code": "ace",
    "label": "Acehnese"
  },
  {
    "code": "ach",
    "label": "Acholi"
  },
  {
    "code": "af",
    "label": "Afrikaans (Afrikaans)"
  },
  {
    "code": "sq",
    "label": "Albanian"
  },
  {
    "code": "alz",
    "label": "Alur"
  },
  {
    "code": "am",
    "label": "Amharic (አማርኛ)"
  },
  {
    "code": "ar",
    "label": "Arabic (العربية)"
  },
  {
    "code": "hy",
    "label": "Armenian (Հայերեն)"
  },
  {
    "code": "as",
    "label": "Assamese (অસમীয়া)"
  },
  {
    "code": "awa",
    "label": "Awadhi"
  },
  {
    "code": "ay",
    "label": "Aymara"
  },
  {
    "code": "az",
    "label": "Azerbaijani"
  },
  {
    "code": "ban",
    "label": "Balinese"
  },
  {
    "code": "bm",
    "label": "Bambara"
  },
  {
    "code": "ba",
    "label": "Bashkir"
  },
  {
    "code": "eu",
    "label": "Basque"
  },
  {
    "code": "btx",
    "label": "Batak Karo"
  },
  {
    "code": "bts",
    "label": "Batak Simalungun"
  },
  {
    "code": "bbc",
    "label": "Batak Toba"
  },
  {
    "code": "be",
    "label": "Belarusian"
  },
  {
    "code": "bem",
    "label": "Bemba"
  },
  {
    "code": "bn",
    "label": "Bengali (বাংলা)"
  },
  {
    "code": "bew",
    "label": "Betawi"
  },
  {
    "code": "bho",
    "label": "Bhojpuri"
  },
  {
    "code": "bik",
    "label": "Bikol"
  },
  {
    "code": "bs",
    "label": "Bosnian"
  },
  {
    "code": "br",
    "label": "Breton"
  },
  {
    "code": "bg",
    "label": "Bulgarian (Български)"
  },
  {
    "code": "my",
    "label": "Burmese (မြန်မာဘာသာ)"
  },
  {
    "code": "bua",
    "label": "Buryat"
  },
  {
    "code": "yue",
    "label": "Cantonese"
  },
  {
    "code": "ca",
    "label": "Catalan (Català)"
  },
  {
    "code": "ceb",
    "label": "Cebuano"
  },
  {
    "code": "ny",
    "label": "Chichewa"
  },
  {
    "code": "zh-CN",
    "label": "Chinese (Simplified)"
  },
  {
    "code": "zh-TW",
    "label": "Chinese (Traditional)"
  },
  {
    "code": "zh",
    "label": "Chinese (中文)"
  },
  {
    "code": "cv",
    "label": "Chuvash"
  },
  {
    "code": "co",
    "label": "Corsican"
  },
  {
    "code": "crh",
    "label": "Crimean Tatar"
  },
  {
    "code": "hr",
    "label": "Croatian (Hrvatski)"
  },
  {
    "code": "cs",
    "label": "Czech (Čeština)"
  },
  {
    "code": "da",
    "label": "Danish (Dansk)"
  },
  {
    "code": "dv",
    "label": "Dhivehi"
  },
  {
    "code": "din",
    "label": "Dinka"
  },
  {
    "code": "doi",
    "label": "Dogri"
  },
  {
    "code": "dov",
    "label": "Dombe"
  },
  {
    "code": "nl",
    "label": "Dutch (Nederlands)"
  },
  {
    "code": "dz",
    "label": "Dzongkha"
  },
  {
    "code": "eo",
    "label": "Esperanto"
  },
  {
    "code": "et",
    "label": "Estonian (Eesti)"
  },
  {
    "code": "ee",
    "label": "Ewe"
  },
  {
    "code": "fj",
    "label": "Fijian"
  },
  {
    "code": "tl",
    "label": "Filipino (Wikang Filipino)"
  },
  {
    "code": "fi",
    "label": "Finnish (Suomi)"
  },
  {
    "code": "fr-CA",
    "label": "French (Canada)"
  },
  {
    "code": "fr",
    "label": "French (Français)"
  },
  {
    "code": "fy",
    "label": "Frisian"
  },
  {
    "code": "ff",
    "label": "Fulani"
  },
  {
    "code": "gaa",
    "label": "Ga"
  },
  {
    "code": "gl",
    "label": "Galician"
  },
  {
    "code": "ka",
    "label": "Georgian (ქართული)"
  },
  {
    "code": "de",
    "label": "German (Deutsch)"
  },
  {
    "code": "el",
    "label": "Greek (Ελληνικά)"
  },
  {
    "code": "gn",
    "label": "Guarani"
  },
  {
    "code": "gu",
    "label": "Gujarati (ગુજરાતી)"
  },
  {
    "code": "ht",
    "label": "Haitian Creole"
  },
  {
    "code": "cnh",
    "label": "Hakha Chin"
  },
  {
    "code": "ha",
    "label": "Hausa"
  },
  {
    "code": "haw",
    "label": "Hawaiian"
  },
  {
    "code": "iw",
    "label": "Hebrew"
  },
  {
    "code": "he",
    "label": "Hebrew (עברית)"
  },
  {
    "code": "hil",
    "label": "Hiligaynon"
  },
  {
    "code": "hi",
    "label": "Hindi (हिंदी)"
  },
  {
    "code": "hmn",
    "label": "Hmong"
  },
  {
    "code": "hu",
    "label": "Hungarian (Magyar)"
  },
  {
    "code": "hrx",
    "label": "Hunsrik"
  },
  {
    "code": "is",
    "label": "Icelandic (Íslenska)"
  },
  {
    "code": "ig",
    "label": "Igbo"
  },
  {
    "code": "ilo",
    "label": "Ilocano"
  },
  {
    "code": "id",
    "label": "Indonesian (Bahasa Indonesia)"
  },
  {
    "code": "ga",
    "label": "Irish (Gaeilge)"
  },
  {
    "code": "it",
    "label": "Italiano (Italian)"
  },
  {
    "code": "ja",
    "label": "Japanese (日本語)"
  },
  {
    "code": "jw",
    "label": "Javanese"
  },
  {
    "code": "jv",
    "label": "Javanese"
  },
  {
    "code": "kn",
    "label": "Kannada (ಕನ್ನಡ)"
  },
  {
    "code": "pam",
    "label": "Kapampangan"
  },
  {
    "code": "kk",
    "label": "Kazakh (Қазақша)"
  },
  {
    "code": "km",
    "label": "Khmer (ខ្មែរ)"
  },
  {
    "code": "cgg",
    "label": "Kiga"
  },
  {
    "code": "rw",
    "label": "Kinyarwanda"
  },
  {
    "code": "ktu",
    "label": "Kituba"
  },
  {
    "code": "gom",
    "label": "Konkani"
  },
  {
    "code": "ko",
    "label": "Korean (한국어)"
  },
  {
    "code": "kri",
    "label": "Krio"
  },
  {
    "code": "ku",
    "label": "Kurdish (Kurmanji)"
  },
  {
    "code": "ckb",
    "label": "Kurdish (Sorani)"
  },
  {
    "code": "ky",
    "label": "Kyrgyz"
  },
  {
    "code": "lo",
    "label": "Lao (ລາວ)"
  },
  {
    "code": "ltg",
    "label": "Latgalian"
  },
  {
    "code": "la",
    "label": "Latin"
  },
  {
    "code": "lv",
    "label": "Latvian (Latviešu)"
  },
  {
    "code": "lij",
    "label": "Ligurian"
  },
  {
    "code": "li",
    "label": "Limburgish"
  },
  {
    "code": "ln",
    "label": "Lingala"
  },
  {
    "code": "lt",
    "label": "Lithuanian (Lietuvių)"
  },
  {
    "code": "lmo",
    "label": "Lombard"
  },
  {
    "code": "lg",
    "label": "Luganda"
  },
  {
    "code": "luo",
    "label": "Luo"
  },
  {
    "code": "lb",
    "label": "Luxembourgish"
  },
  {
    "code": "mk",
    "label": "Macedonian"
  },
  {
    "code": "mai",
    "label": "Maithili"
  },
  {
    "code": "mak",
    "label": "Makassar"
  },
  {
    "code": "mg",
    "label": "Malagasy"
  },
  {
    "code": "ms",
    "label": "Malay (Bahasa Melayu)"
  },
  {
    "code": "ms-Arab",
    "label": "Malay (Jawi)"
  },
  {
    "code": "ml",
    "label": "Malayalam (മലയാളം)"
  },
  {
    "code": "mt",
    "label": "Maltese"
  },
  {
    "code": "mi",
    "label": "Maori"
  },
  {
    "code": "mr",
    "label": "Marathi (मराठी)"
  },
  {
    "code": "chm",
    "label": "Meadow Mari"
  },
  {
    "code": "mni-Mtei",
    "label": "Meiteilon (Manipuri)"
  },
  {
    "code": "min",
    "label": "Minang"
  },
  {
    "code": "lus",
    "label": "Mizo"
  },
  {
    "code": "mn",
    "label": "Mongolian (Монгол)"
  },
  {
    "code": "nr",
    "label": "Ndebele (South)"
  },
  {
    "code": "new",
    "label": "Nepalbhasa (Newari)"
  },
  {
    "code": "ne",
    "label": "Nepali (नेपाली)"
  },
  {
    "code": "no",
    "label": "Norwegian (Norsk)"
  },
  {
    "code": "nus",
    "label": "Nuer"
  },
  {
    "code": "oc",
    "label": "Occitan"
  },
  {
    "code": "or",
    "label": "Odia (ଓଡ଼ିଆ)"
  },
  {
    "code": "om",
    "label": "Oromo"
  },
  {
    "code": "pag",
    "label": "Pangasinan"
  },
  {
    "code": "pap",
    "label": "Papiamento"
  },
  {
    "code": "ps",
    "label": "Pashto"
  },
  {
    "code": "fa",
    "label": "Persian (فارسی)"
  },
  {
    "code": "pl",
    "label": "Polish (Polski)"
  },
  {
    "code": "pt-PT",
    "label": "Portuguese (Portugal)"
  },
  {
    "code": "pt",
    "label": "Portuguese (Português)"
  },
  {
    "code": "pa-Arab",
    "label": "Punjabi (Shahmukhi)"
  },
  {
    "code": "pa",
    "label": "Punjabi (ਪੰਜਾਬী)"
  },
  {
    "code": "qu",
    "label": "Quechua"
  },
  {
    "code": "rom",
    "label": "Romani"
  },
  {
    "code": "ro",
    "label": "Romanian (Română)"
  },
  {
    "code": "rn",
    "label": "Rundi"
  },
  {
    "code": "ru",
    "label": "Russian (Русский)"
  },
  {
    "code": "sm",
    "label": "Samoan"
  },
  {
    "code": "sg",
    "label": "Sango"
  },
  {
    "code": "sa",
    "label": "Sanskrit"
  },
  {
    "code": "gd",
    "label": "Scots Gaelic"
  },
  {
    "code": "nso",
    "label": "Sepedi"
  },
  {
    "code": "sr",
    "label": "Serbian (Српски)"
  },
  {
    "code": "st",
    "label": "Sesotho"
  },
  {
    "code": "crs",
    "label": "Seychellois Creole"
  },
  {
    "code": "shn",
    "label": "Shan"
  },
  {
    "code": "sn",
    "label": "Shona"
  },
  {
    "code": "scn",
    "label": "Sicilian"
  },
  {
    "code": "szl",
    "label": "Silesian"
  },
  {
    "code": "sd",
    "label": "Sindhi"
  },
  {
    "code": "si",
    "label": "Sinhala (සිංහလ)"
  },
  {
    "code": "sk",
    "label": "Slovak (Slovenčina)"
  },
  {
    "code": "sl",
    "label": "Slovenian (Slovenščina)"
  },
  {
    "code": "so",
    "label": "Somali (Soomaali)"
  },
  {
    "code": "es",
    "label": "Spanish (Español)"
  },
  {
    "code": "su",
    "label": "Sundanese"
  },
  {
    "code": "sw",
    "label": "Swahili (Kiswahili)"
  },
  {
    "code": "ss",
    "label": "Swati"
  },
  {
    "code": "sv",
    "label": "Swedish (Svenska)"
  },
  {
    "code": "tg",
    "label": "Tajik"
  },
  {
    "code": "ta",
    "label": "Tamil (தமிழ்)"
  },
  {
    "code": "tt",
    "label": "Tatar"
  },
  {
    "code": "te",
    "label": "Telugu (తెలుగు)"
  },
  {
    "code": "tet",
    "label": "Tetum"
  },
  {
    "code": "th",
    "label": "Thai (ไทย)"
  },
  {
    "code": "ti",
    "label": "Tigrinya"
  },
  {
    "code": "ts",
    "label": "Tsonga"
  },
  {
    "code": "tn",
    "label": "Tswana"
  },
  {
    "code": "tr",
    "label": "Turkish (Türkçe)"
  },
  {
    "code": "tk",
    "label": "Turkmen"
  },
  {
    "code": "ak",
    "label": "Twi"
  },
  {
    "code": "uk",
    "label": "Ukrainian (Українська)"
  },
  {
    "code": "ur",
    "label": "Urdu (اردو)"
  },
  {
    "code": "ug",
    "label": "Uyghur"
  },
  {
    "code": "uz",
    "label": "Uzbek"
  },
  {
    "code": "vi",
    "label": "Vietnamese (Tiếng Việt)"
  },
  {
    "code": "cy",
    "label": "Welsh (Cymraeg)"
  },
  {
    "code": "xh",
    "label": "Xhosa"
  },
  {
    "code": "yi",
    "label": "Yiddish"
  },
  {
    "code": "yo",
    "label": "Yoruba"
  },
  {
    "code": "yua",
    "label": "Yucatec Maya"
  },
  {
    "code": "zu",
    "label": "Zulu"
  }
]

const SUPPORTED_LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((item) => item.code));

const ENGLISH_DICTIONARY = {};

const loadEnglishDictionary = async () => {
  try {
    const en = await import('../translations/en.json');
    Object.assign(ENGLISH_DICTIONARY, en.default || en);
  } catch (error) {
    console.error('Failed to load English dictionary:', error);
  }
};
loadEnglishDictionary();

const LanguageContext = createContext(null);

const normalizeLanguage = (value) => {
  if (!value) return DEFAULT_LANGUAGE;
  const normalized = String(value).trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGE_CODES.has(normalized) ? normalized : DEFAULT_LANGUAGE;
};

const applyTemplate = (text, params) => {
  if (!params || typeof text !== 'string') return text;
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{{${key}}}`, String(value));
  }, text);
};

const shouldSkipTranslation = (text) => {
  const value = String(text || '').trim();
  if (!value) return true;
  if (value.length <= 1) return true;
  if (!/[\p{L}]/u.test(value)) return true;
  if (/^https?:\/\//i.test(value) || /^www\./i.test(value)) return true;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(value)) return true;
  if (/^[\d\s()+\-.,/:%₹$€£¥]+$/.test(value)) return true;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return true;
  if (/^[A-Za-z0-9_-]{8,}$/.test(value) && !/[\s]/.test(value)) return true;
  return false;
};

const getFallbackText = (key, fallbackText) => {
  if (typeof fallbackText === 'string' && fallbackText.trim()) {
    return fallbackText;
  }
  return ENGLISH_DICTIONARY[key] || key;
};

const isAdminPath = () => {
  return window.location.pathname.startsWith('/admin');
};

export const LanguageProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { locale, switchLocale } = useLocale();

  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const persisted = localStorage.getItem('selectedLanguage') || localStorage.getItem('appLanguage') || localStorage.getItem('locale_lang') || locale || DEFAULT_LANGUAGE;
    return normalizeLanguage(persisted);
  });
  const [translationCache, setTranslationCache] = useState({});
  const [loading, setLoading] = useState(false);
  const pendingTranslationsRef = useRef(new Map());
  const failedTranslationsRef = useRef(new Map());
  const batchTimerRef = useRef(null);

  const persistLanguage = useCallback((nextLanguage) => {
    localStorage.setItem('selectedLanguage', nextLanguage);
    localStorage.setItem('appLanguage', nextLanguage);
    localStorage.setItem('locale_lang', nextLanguage);
  }, []);

  const syncBackendPreference = useCallback(async (nextLanguage) => {
    if (!isAuthenticated) return;
    try {
      await userAPI.updateLanguage({ language: nextLanguage });
    } catch (_) {
      try {
        await authAPI.updateLocale({ locale: nextLanguage });
      } catch (__){
        // Keep UI responsive even if API update fails.
      }
    }
    try {
      const rawUser = localStorage.getItem('authUser') || localStorage.getItem('user');
      if (!rawUser) return;
      const parsedUser = JSON.parse(rawUser);
      localStorage.setItem('authUser', JSON.stringify({
        ...parsedUser,
        locale: nextLanguage,
        preferredLanguage: nextLanguage,
      }));
    } catch (_) {
      // Ignore local cache update issues.
    }
  }, [isAuthenticated]);

  const changeLanguage = useCallback(async (nextLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    pendingTranslationsRef.current.delete(normalized);
    failedTranslationsRef.current.delete(normalized);
    setSelectedLanguage(normalized);
    persistLanguage(normalized);
    switchLocale(normalized);
    syncBackendPreference(normalized);
  }, [persistLanguage, switchLocale, syncBackendPreference]);

  const updateTranslationCache = useCallback((language, sourceTexts, translatedTexts) => {
    setTranslationCache((previous) => {
      const currentLanguageCache = previous[language] || {};
      const nextLanguageCache = { ...currentLanguageCache };

      sourceTexts.forEach((text, index) => {
        const translatedText = translatedTexts[index];
        if (text && translatedText && translatedText !== text) {
          nextLanguageCache[text] = translatedText;
        }
      });

      return {
        ...previous,
        [language]: nextLanguageCache,
      };
    });
  }, []);

  const translateBatch = useCallback(async (textArray = [], targetLanguage = selectedLanguage) => {
    const normalizedLanguage = normalizeLanguage(targetLanguage);
    const sourceTexts = Array.isArray(textArray) ? textArray.map((item) => String(item ?? '')) : [];

    if (normalizedLanguage === DEFAULT_LANGUAGE) {
      return sourceTexts;
    }

    const cachedLanguage = translationCache[normalizedLanguage] || {};
    const output = [...sourceTexts];
    const missingTexts = [];
    const missingIndexesByText = new Map();

    sourceTexts.forEach((text, index) => {
      if (!text || shouldSkipTranslation(text)) {
        output[index] = text;
        return;
      }

      const cachedValue = cachedLanguage[text];
      if (cachedValue) {
        output[index] = cachedValue;
        return;
      }

      if (!missingIndexesByText.has(text)) {
        missingIndexesByText.set(text, []);
        missingTexts.push(text);
      }
      missingIndexesByText.get(text).push(index);
    });

    if (missingTexts.length === 0) {
      return output;
    }

    try {
      // Chunk missing texts in batches of 100 to avoid backend validation limits
      const BATCH_SIZE = 100;
      const allTranslatedTexts = [];

      for (let i = 0; i < missingTexts.length; i += BATCH_SIZE) {
        const chunk = missingTexts.slice(i, i + BATCH_SIZE);
        const { data } = await translationAPI.translateBatch({
          texts: chunk,
          targetLanguage: normalizedLanguage,
        });
        const chunkResults = data?.data?.translatedTexts || data?.translatedTexts || [];
        
        // Ensure we handle cases where backend might return fewer results than requested
        // but normally it should match the chunk length.
        allTranslatedTexts.push(...chunkResults);
      }

      updateTranslationCache(normalizedLanguage, missingTexts, allTranslatedTexts);

      missingTexts.forEach((text, index) => {
        const translatedText = allTranslatedTexts[index] || text;
        const targetIndexes = missingIndexesByText.get(text) || [];
        targetIndexes.forEach((itemIndex) => {
          output[itemIndex] = translatedText;
        });
      });

      return output;
    } catch (error) {
      const failedQueue = failedTranslationsRef.current.get(normalizedLanguage) || new Set();
      missingTexts.forEach((text) => failedQueue.add(text));
      failedTranslationsRef.current.set(normalizedLanguage, failedQueue);
      return output;
    }
  }, [selectedLanguage, translationCache, updateTranslationCache]);

  const translateText = useCallback(async (text, targetLanguage = selectedLanguage) => {
    if (isAdminPath()) return text;
    const [translatedText] = await translateBatch([text], targetLanguage);
    return translatedText;
  }, [selectedLanguage, translateBatch]);

  const flushQueue = useCallback(async (lang) => {
    const queue = pendingTranslationsRef.current.get(lang);
    if (!queue || queue.size === 0) return;

    const texts = [...queue];
    queue.clear();

    setLoading(true);
    try {
      await translateBatch(texts, lang);
    } catch (e) {
      console.error('Translation batch error:', e);
    } finally {
      setLoading(false);
    }
  }, [translateBatch]);

  const scheduleTranslation = useCallback((text) => {
    if (selectedLanguage === DEFAULT_LANGUAGE) return;
    if (isAdminPath()) return;
    if (shouldSkipTranslation(text)) return;
    if ((translationCache[selectedLanguage] || {})[text]) return;
    if ((failedTranslationsRef.current.get(selectedLanguage) || new Set()).has(text)) return;

    let languageQueue = pendingTranslationsRef.current.get(selectedLanguage);
    if (!languageQueue) {
      languageQueue = new Set();
      pendingTranslationsRef.current.set(selectedLanguage, languageQueue);
    }

    languageQueue.add(text);

    // Debounce the queue flush so it aggregates all requests from the render loop
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    batchTimerRef.current = setTimeout(() => {
      flushQueue(selectedLanguage);
    }, 150); // 150ms debounce
  }, [selectedLanguage, translationCache, flushQueue]);

  useEffect(() => {
    if (!locale) return;
    const normalized = normalizeLanguage(locale);
    if (normalized === selectedLanguage) return;
    setSelectedLanguage(normalized);
    persistLanguage(normalized);
  }, [locale, persistLanguage, selectedLanguage]);

  useEffect(() => {
    document.documentElement.lang = selectedLanguage;
    document.documentElement.dir = RTL_LANGUAGES.has(selectedLanguage) ? 'rtl' : 'ltr';
  }, [selectedLanguage]);

  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, []);

  const t = useCallback((key, fallbackOrParams, maybeParams) => {
    let fallbackText = '';
    let params = null;

    if (typeof fallbackOrParams === 'string' || typeof fallbackOrParams === 'number') {
      fallbackText = String(fallbackOrParams);
      params = maybeParams || null;
    } else if (fallbackOrParams && typeof fallbackOrParams === 'object' && !Array.isArray(fallbackOrParams)) {
      params = fallbackOrParams;
    }

    const baseText = getFallbackText(key, fallbackText);

    if (selectedLanguage === DEFAULT_LANGUAGE || isAdminPath()) {
      return applyTemplate(baseText, params);
    }

    const cachedLanguage = translationCache[selectedLanguage] || {};
    const cachedValue = cachedLanguage[baseText];

    if (cachedValue) {
      return applyTemplate(cachedValue, params);
    }

    scheduleTranslation(baseText);
    return applyTemplate(baseText, params);
  }, [scheduleTranslation, selectedLanguage, translationCache]);

  const value = useMemo(() => ({
    selectedLanguage,
    setSelectedLanguage: changeLanguage,
    language: selectedLanguage,
    languages: SUPPORTED_LANGUAGES,
    loading,
    changeLanguage,
    translateText,
    translateBatch,
    t,
    isRTL: RTL_LANGUAGES.has(selectedLanguage),
  }), [selectedLanguage, loading, changeLanguage, t, translateBatch, translateText]);

  return createElement(LanguageContext.Provider, { value }, children);
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

export default LanguageContext;
