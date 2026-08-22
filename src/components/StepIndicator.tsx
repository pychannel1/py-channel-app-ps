import React from 'react';
import { StudioStep } from '../types';
import { Upload, FileText, Languages, Film, Check, ChevronRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface StepIndicatorProps {
  currentStep: StudioStep;
  onSelectStep: (step: StudioStep) => void;
  hasVideo: boolean;
  hasSourceText: boolean;
  hasMyanmarText: boolean;
  isRenderComplete: boolean;
}

interface StepMeta {
  step: StudioStep;
  titleMm: string;
  subMm: string;
  titleEn: string;
  subEn: string;
  icon: React.ElementType;
}

// User-specified exact Bilingual Step Workflow Labels
const STEPS: StepMeta[] = [
  {
    step: 1,
    titleMm: 'ဗီဒီယိုတင်ပါ (Upload Video)',
    subMm: 'စာသားထုတ်မည် (Transcribe Audio)',
    titleEn: 'Upload Video',
    subEn: 'Transcribe Audio',
    icon: Upload,
  },
  {
    step: 2,
    titleMm: 'မူရင်းစာသား (Original Source)',
    subMm: 'မြန်မာပြန် (Burmese Translation)',
    titleEn: 'Original Source',
    subEn: 'Burmese Translation',
    icon: FileText,
  },
  {
    step: 3,
    titleMm: 'AI အသံရွေးချယ်ပါ (Select AI Voice)',
    subMm: 'အသံဖန်တီးမည် (Generate Voice)',
    titleEn: 'Select AI Voice',
    subEn: 'Generate Voice',
    icon: Languages,
  },
  {
    step: 4,
    titleMm: 'ဗီဒီယို ထုတ်ယူမည် (Render Recap Video)',
    subMm: 'ဒေါင်းလုဒ် (Download)',
    titleEn: 'Render Recap Video',
    subEn: 'Download',
    icon: Film,
  },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  hasVideo,
  hasSourceText,
  hasMyanmarText,
  isRenderComplete,
}) => {
  const { language } = useLanguage();

  // Check if step is accessible
  const isStepAccessible = (step: StudioStep): boolean => {
    if (step === 1) return true;
    if (step === 2) return hasVideo;
    if (step === 3) return hasSourceText;
    if (step === 4) return hasMyanmarText || isRenderComplete;
    return false;
  };

  const isStepCompleted = (step: StudioStep): boolean => {
    if (step === 1) return hasVideo && currentStep > 1;
    if (step === 2) return hasSourceText && currentStep > 2;
    if (step === 3) return hasMyanmarText && currentStep > 3;
    if (step === 4) return isRenderComplete;
    return false;
  };

  return (
    <div className="w-full mb-6">
      <nav aria-label="Workflow Steps" className="glass-panel rounded-2xl p-2 sm:p-2.5 overflow-x-auto custom-scrollbar">
        <ol className="flex flex-row flex-nowrap items-center gap-2 w-full min-w-[720px] lg:min-w-0 lg:grid lg:grid-cols-4">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const active = currentStep === s.step;
            const completed = isStepCompleted(s.step);
            const accessible = isStepAccessible(s.step);

            const title = language === 'mm' ? s.titleMm : s.titleEn;
            const subtitle = language === 'mm' ? s.subMm : s.subEn;

            return (
              <li key={s.step} className="relative flex-1">
                <button
                  id={`step-breadcrumb-${s.step}`}
                  disabled={!accessible}
                  onClick={() => accessible && onSelectStep(s.step)}
                  className={`w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-amber-500/25 via-orange-500/15 to-transparent border border-amber-500/50 shadow-md shadow-amber-500/15 ring-1 ring-amber-500/30'
                      : completed
                      ? 'bg-slate-900/70 border border-emerald-500/30 text-slate-300 hover:bg-slate-800/80'
                      : accessible
                      ? 'bg-slate-900/40 border border-white/10 text-slate-400 hover:bg-slate-800/50'
                      : 'opacity-40 bg-slate-950/40 border border-transparent text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {/* Step Number / Icon Badge */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                      active
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-extrabold shadow-sm'
                        : completed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-white/10'
                    }`}
                  >
                    {completed ? <Check className="w-4 h-4 text-emerald-400" /> : <Icon className="w-4 h-4" />}
                  </div>

                  {/* Step Bilingual Labels */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold tracking-tight truncate ${
                          active
                            ? 'text-amber-300'
                            : completed
                            ? 'text-emerald-300'
                            : 'text-slate-200'
                        } ${language === 'mm' ? 'font-burmese' : 'font-sans'}`}
                      >
                        {title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-burmese truncate mt-0.5">
                      {subtitle}
                    </p>
                  </div>

                  {/* Arrow for intermediate steps */}
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-600 hidden xl:block opacity-40 ml-auto flex-shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
