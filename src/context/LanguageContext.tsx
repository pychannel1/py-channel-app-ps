import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'mm' | 'en';

export interface Translations {
  // Navigation & Drawer
  studio: string;
  transcriptHub: string;
  buyVipPlans: string;
  orders: string;
  downloads: string;
  profile: string;
  support: string;
  logout: string;

  // Step Workflow
  step1Title: string;
  step1Subtitle: string;
  step2Title: string;
  step2Subtitle: string;
  step3Title: string;
  step3Subtitle: string;
  step4Title: string;
  step4Subtitle: string;

  // General App
  appTitle: string;
  appSubtitle: string;
  apiKeys: string;
  vipSettings: string;
  adminPortal: string;
  freePlanBadge: string;
  vipPlanBadge: string;
  pendingBadge: string;
  creditsLabel: string;
}

const TRANSLATIONS: Record<Language, Translations> = {
  mm: {
    // Dual Language Menu Items & Workspace Labels (Exact user specification)
    studio: 'စတူဒီယို (Studio)',
    transcriptHub: 'စာသားမှတ်တမ်းခန်း',
    buyVipPlans: 'VIP အဆင့်မြှင့်မည်',
    orders: 'ပြေစာစစ်ဆေးမှု',
    downloads: 'ရယူပြီးသောဖိုင်များ',
    profile: 'အကောင့်အချက်အလက်',
    support: 'အကူအညီရယူရန်',
    logout: 'အကောင့်ထွက်မည်',

    // Step Workflow Bilingual Labels (Exact user specification)
    step1Title: 'ဗီဒီယိုတင်ပါ (Upload Video)',
    step1Subtitle: 'စာသားထုတ်မည် (Transcribe Audio)',
    step2Title: 'မူရင်းစာသား (Original Source)',
    step2Subtitle: 'မြန်မာပြန် (Burmese Translation)',
    step3Title: 'AI အသံရွေးချယ်ပါ (Select AI Voice)',
    step3Subtitle: 'အသံဖန်တီးမည် (Generate Voice)',
    step4Title: 'ဗီဒီယို ထုတ်ယူမည် (Render Recap Video)',
    step4Subtitle: 'ဒေါင်းလုဒ် (Download)',

    // General App
    appTitle: 'pY Channel AI Movie Recap Studio',
    appSubtitle: 'AI ရုပ်ရှင်ဇာတ်လမ်းပြော ရီကပ် ဖန်တီးမှုစနစ်',
    apiKeys: 'API Keys သတ်မှတ်ချက်',
    vipSettings: 'VIP အဆင့်နှင့် ဆက်တင်များ',
    adminPortal: 'Admin စီမံခန့်ခွဲမှု',
    freePlanBadge: 'အခမဲ့အသုံးပြုခွင့် (၂ ကြိမ်/ရက်)',
    vipPlanBadge: '👑 VIP အကောင့်',
    pendingBadge: '⏳ ငွေလွှဲစစ်ဆေးဆဲ',
    creditsLabel: 'ကျန်ရှိသော အကြိမ်ရေ',
  },
  en: {
    // Dual Language Menu Items & Workspace Labels (Exact user specification)
    studio: 'Studio',
    transcriptHub: 'Transcript Hub',
    buyVipPlans: 'Buy VIP / Plans',
    orders: 'Orders & Subscriptions',
    downloads: 'Downloads',
    profile: 'Profile',
    support: 'Customer Support',
    logout: 'Logout',

    // Step Workflow Bilingual Labels (Exact user specification)
    step1Title: 'Upload Video',
    step1Subtitle: 'Transcribe Audio',
    step2Title: 'Original Source',
    step2Subtitle: 'Burmese Translation',
    step3Title: 'Select AI Voice',
    step3Subtitle: 'Generate Voice',
    step4Title: 'Render Recap Video',
    step4Subtitle: 'Download',

    // General App
    appTitle: 'pY Channel AI Movie Recap Studio',
    appSubtitle: 'AI Movie Recap & Burmese Voice Synthesis Studio',
    apiKeys: 'API Keys Configuration',
    vipSettings: 'VIP & Settings',
    adminPortal: 'Admin Master Portal',
    freePlanBadge: 'Free Plan (2 Recaps/day)',
    vipPlanBadge: '👑 VIP Member',
    pendingBadge: '⏳ Verification Pending',
    creditsLabel: 'Available Recaps',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  isBurmese: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('pychannel_language');
      if (saved === 'en' || saved === 'mm') {
        return saved;
      }
    } catch (e) {
      console.warn('Could not read language from localStorage:', e);
    }
    return 'mm'; // Default to Myanmar as requested
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('pychannel_language', lang);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'mm' ? 'en' : 'mm');
  };

  useEffect(() => {
    // Set document lang attribute
    document.documentElement.lang = language === 'mm' ? 'my' : 'en';
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    toggleLanguage,
    t: TRANSLATIONS[language],
    isBurmese: language === 'mm',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
