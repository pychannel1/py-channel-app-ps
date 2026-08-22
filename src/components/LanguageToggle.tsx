import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  variant?: 'compact' | 'full' | 'sidebar';
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { language, setLanguage } = useLanguage();

  if (variant === 'sidebar') {
    return (
      <div className={`p-2.5 rounded-2xl bg-slate-900/80 border border-white/10 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'mm' ? 'ဘာသာစကား ရွေးချယ်မှု' : 'Language Selection'}</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            {language === 'mm' ? 'မြန်မာ' : 'ENG'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/5">
          <button
            type="button"
            id="sidebar-lang-mm-btn"
            onClick={() => setLanguage('mm')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              language === 'mm'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>🇲🇲</span>
            <span className="font-burmese">မြန်မာ</span>
          </button>
          <button
            type="button"
            id="sidebar-lang-en-btn"
            onClick={() => setLanguage('en')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <span>🇬🇧</span>
            <span className="font-sans">ENG</span>
          </button>
        </div>
      </div>
    );
  }

  // Header / Compact Variant
  return (
    <div
      id="header-language-switcher"
      className={`inline-flex items-center p-0.5 sm:p-1 rounded-xl bg-slate-900/90 border border-white/15 shadow-inner ${className}`}
      title="Switch Language / ဘာသာစကား ပြောင်းလဲမည်"
    >
      <button
        type="button"
        id="header-lang-mm-btn"
        onClick={() => setLanguage('mm')}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          language === 'mm'
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
      >
        <span className="text-xs">🇲🇲</span>
        <span className="font-burmese text-[11px] sm:text-xs">မြန်မာ</span>
      </button>

      <button
        type="button"
        id="header-lang-en-btn"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
      >
        <span className="text-xs">🇬🇧</span>
        <span className="font-sans text-[11px] sm:text-xs font-semibold">ENG</span>
      </button>
    </div>
  );
};
