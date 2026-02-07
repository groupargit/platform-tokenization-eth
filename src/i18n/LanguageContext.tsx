import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { es, en } from './translations';
import type { TranslationKeys, Language } from './types';

const translations: Record<Language, TranslationKeys> = { es, en };

const SPANISH_COUNTRIES = [
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GQ', 
  'GT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'PR', 'ES', 'UY', 'VE'
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  isAutoDetected: boolean;
  detectedCountry: string | null;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'casa-color-language';

function detectLanguageFromBrowser(): Language {
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  
  if (browserLang.toLowerCase().startsWith('es')) {
    return 'es';
  }
  
  return 'es';
}

async function detectLanguageFromLocation(): Promise<{ language: Language; country: string | null }> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }
    
    const data = await response.json();
    const countryCode = data.country_code?.toUpperCase();
    
    if (countryCode) {
      const isSpanishCountry = SPANISH_COUNTRIES.includes(countryCode);
      return {
        language: isSpanishCountry ? 'es' : 'en',
        country: countryCode,
      };
    }
  } catch (error) {
    console.log('Could not detect location, using browser language');
  }
  
  return {
    language: detectLanguageFromBrowser(),
    country: null,
  };
}

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') {
      return saved;
    }
    return detectLanguageFromBrowser();
  });
  
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      detectLanguageFromLocation().then(({ language: detectedLang, country }) => {
        setLanguageState(detectedLang);
        setIsAutoDetected(true);
        setDetectedCountry(country);
      });
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setIsAutoDetected(false);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isAutoDetected, detectedCountry }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export type { Language, TranslationKeys };
