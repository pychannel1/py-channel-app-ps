import React from 'react';
import { StudioStep } from '../types';
import { Upload, FileText, Languages, Film, Check, ChevronRight } from 'lucide-react';

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
  labelEn: string;
  labelMm: string;
  icon: React.ElementType;
}

const STEPS: StepMeta[] = [
  { step: 1, labelEn: '1. Upload', labelMm: 'Video တင်ပါ', icon: Upload },
  { step: 2, labelEn: '2. Source Text', labelMm: 'မူရင်းစာသား', icon: FileText },
  { step: 3, labelEn: '3. Myanmar', labelMm: 'မြန်မာဘာသာပြန်', icon: Languages },
  { step: 4, labelEn: '4. Result', labelMm: 'ရလဒ်များ', icon: Film },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onSelectStep,
  hasVideo,
  hasSourceText,
  hasMyanmarText,
  isRenderComplete,
}) => {
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
        <ol className="flex flex-row flex-nowrap items-center gap-2 w-full min-w-[600px] sm:min-w-0 sm:grid sm:grid-cols-4">
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const active = currentStep === s.step;
            const completed = isStepCompleted(s.step);
            const accessible = isStepAccessible(s.step);

            return (
              <li key={s.step} className="relative">
                <button
                  id={`step-breadcrumb-${s.step}`}
                  disabled={!accessible}
                  onClick={() => accessible && onSelectStep(s.step)}
                  className={`w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/40 shadow-md shadow-amber-500/10'
                      : completed
                      ? 'bg-slate-900/60 border border-emerald-500/20 text-slate-300 hover:bg-slate-800/80 cursor-pointer'
                      : accessible
                      ? 'bg-slate-900/40 border border-white/5 text-slate-400 hover:bg-slate-800/50 cursor-pointer'
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

                  {/* Step Labels */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold tracking-wide uppercase truncate ${
                          active ? 'text-amber-300' : completed ? 'text-emerald-300' : 'text-slate-300'
                        }`}
                      >
                        {s.labelEn}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-burmese truncate">
                      {s.labelMm}
                    </p>
                  </div>

                  {/* Arrow for intermediate steps on desktop */}
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-600 hidden lg:block opacity-40 ml-auto" />
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
