import React, { useState } from 'react';
import {
  UploadCloud,
  FileVideo,
  Play,
  Pause,
  Sparkles,
  Volume2,
  Download,
  CheckCircle2,
  RefreshCw,
  Clock,
  Film,
  Sliders,
  Check,
  ArrowRight,
  ArrowLeft,
  Share2,
  FileText,
} from 'lucide-react';
import { BurmeseVoiceAvatar, SampleMovie, TranscriptSegment, UserWorkflowStep } from '../types';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { SAMPLE_MOVIES } from '../data/sampleMovies';

interface UserStudioWorkflowProps {
  currentStep: UserWorkflowStep;
  onChangeStep: (step: UserWorkflowStep) => void;
  // Video State
  videoPreviewUrl: string | null;
  videoDurationFormatted: string;
  videoDurationSeconds: number;
  videoFileName: string;
  onFileUpload: (file: File) => void;
  onSelectSampleMovie: (movie: SampleMovie) => void;
  onChangeFile: () => void;
  // Voice State
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  pitchOffset: number;
  speedMultiplier: number;
  onChangePitch: (val: number) => void;
  onChangeSpeed: (val: number) => void;
  isPlayingPreview: boolean;
  onPlayVoicePreview: (customText?: string, voice?: BurmeseVoiceAvatar) => void;
  onStopVoicePreview: () => void;
  // Generation & Render State
  isGenerating: boolean;
  generationPhase: string;
  generationProgress: number;
  isRenderComplete: boolean;
  segments: TranscriptSegment[];
  onStartFullGeneration: () => void;
  onStartNewProject: () => void;
}

export const UserStudioWorkflow: React.FC<UserStudioWorkflowProps> = ({
  currentStep,
  onChangeStep,
  videoPreviewUrl,
  videoDurationFormatted,
  videoDurationSeconds,
  videoFileName,
  onFileUpload,
  onSelectSampleMovie,
  onChangeFile,
  selectedVoiceId,
  onSelectVoice,
  pitchOffset,
  speedMultiplier,
  onChangePitch,
  onChangeSpeed,
  isPlayingPreview,
  onPlayVoicePreview,
  onStopVoicePreview,
  isGenerating,
  generationPhase,
  generationProgress,
  isRenderComplete,
  segments,
  onStartFullGeneration,
  onStartNewProject,
}) => {
  const [voiceTab, setVoiceTab] = useState<'all' | 'male' | 'female'>('all');
  const [toneFilter, setToneFilter] = useState<string>('all');
  const [activePreviewingVoiceId, setActivePreviewingVoiceId] = useState<string | null>(null);

  // Filter voices
  const filteredVoices = BURMESE_VOICE_AVATARS.filter((v) => {
    if (voiceTab === 'male' && v.gender !== 'male') return false;
    if (voiceTab === 'female' && v.gender !== 'female') return false;
    if (toneFilter !== 'all' && !v.toneCategory.toLowerCase().includes(toneFilter.toLowerCase())) return false;
    return true;
  });

  const selectedVoice = BURMESE_VOICE_AVATARS.find((v) => v.id === selectedVoiceId) || BURMESE_VOICE_AVATARS[0];

  // Drag & drop handlers for upload
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Trigger preview for specific voice
  const handleAuditionVoice = (voice: BurmeseVoiceAvatar) => {
    if (isPlayingPreview && activePreviewingVoiceId === voice.id) {
      onStopVoicePreview();
      setActivePreviewingVoiceId(null);
    } else {
      setActivePreviewingVoiceId(voice.id);
      onPlayVoicePreview(voice.samplePhraseBurmese, voice);
    }
  };

  // Download SRT Subtitles
  const handleDownloadSrt = () => {
    let srtContent = '';
    segments.forEach((seg, idx) => {
      const startFormatted = seg.start.replace('.', ',');
      const endFormatted = seg.end.replace('.', ',');
      const text = seg.myanmarText || seg.sourceText;
      srtContent += `${idx + 1}\n${startFormatted} --> ${endFormatted}\n${text}\n\n`;
    });
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoFileName.replace(/\.[^/.]+$/, '')}_burmese_recap.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* ========================================================================= */}
      {/* 3-STEP USER PROGRESS NAVIGATION BAR */}
      {/* ========================================================================= */}
      <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-lg">
        <div className="grid grid-cols-3 gap-2 w-full max-w-3xl mx-auto">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => !isGenerating && onChangeStep(1)}
            disabled={isGenerating}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left flex items-center gap-2.5 border ${
              currentStep === 1
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                : videoPreviewUrl
                ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/20'
                : 'bg-slate-950/40 border-transparent text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                currentStep === 1
                  ? 'bg-amber-500 text-black'
                  : videoPreviewUrl
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {videoPreviewUrl && currentStep !== 1 ? '✓' : '1'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold truncate font-burmese">၁။ ဗီဒီယို တင်ပါ</div>
              <div className="text-[10px] text-slate-400 truncate hidden sm:block">Upload Video</div>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => !isGenerating && videoPreviewUrl && onChangeStep(2)}
            disabled={isGenerating || !videoPreviewUrl}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left flex items-center gap-2.5 border ${
              currentStep === 2
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                : selectedVoiceId && videoPreviewUrl
                ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/20'
                : 'bg-slate-950/40 border-transparent text-slate-500 opacity-60'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                currentStep === 2
                  ? 'bg-amber-500 text-black'
                  : selectedVoiceId && currentStep > 2
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {currentStep > 2 ? '✓' : '2'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold truncate font-burmese">၂။ အသံ ရွေးပါ</div>
              <div className="text-[10px] text-slate-400 truncate hidden sm:block">40 Burmese Voices</div>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => !isGenerating && videoPreviewUrl && onChangeStep(3)}
            disabled={isGenerating || !videoPreviewUrl}
            className={`p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer text-left flex items-center gap-2.5 border ${
              currentStep === 3
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                : isRenderComplete
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950/40 border-transparent text-slate-500 opacity-60'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                currentStep === 3
                  ? 'bg-amber-500 text-black'
                  : isRenderComplete
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </div>
            <div className="truncate">
              <div className="text-xs font-bold truncate font-burmese">၃။ ဗီဒီယို ရယူပါ</div>
              <div className="text-[10px] text-slate-400 truncate hidden sm:block">Generate & Download</div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: UPLOAD VIDEO */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Upload Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`glass-panel p-6 sm:p-10 rounded-3xl border-2 border-dashed transition-all text-center relative overflow-hidden ${
              isDragOver
                ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                : videoPreviewUrl
                ? 'border-emerald-500/40 bg-slate-950/80'
                : 'border-white/15 bg-slate-950/60 hover:border-amber-500/40'
            }`}
          >
            {videoPreviewUrl ? (
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-2xl border border-white/10">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{videoDurationFormatted}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs font-bold">
                      MP4
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white truncate max-w-[240px] sm:max-w-md">
                        {videoFileName}
                      </div>
                      <div className="text-xs text-slate-400 font-burmese">
                        ရုပ်ရှင်ဗီဒီယိုဖိုင် အောင်မြင်စွာ တင်ပြီးပါပြီ
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onChangeFile}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                    >
                      ဗီဒီယို အသစ်လဲမည်
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeStep(2)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>မြန်မာ AI အသံ ရွေးချယ်မည် ▶</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white font-burmese">
                    ရုပ်ရှင်ဇာတ်ကား သို့မဟုတ် ဗီဒီယိုဖိုင် တင်ပါ
                  </h3>
                  <p className="text-xs text-slate-400 font-burmese leading-relaxed">
                    MP4, MKV, WebM ဗီဒီယိုဖိုင်များကို Drag & Drop ဆွဲတင်နိုင်ပါသည်
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-xl shadow-amber-500/25 cursor-pointer transition-all">
                  <FileVideo className="w-4 h-4" />
                  <span>ဗီဒီယိုဖိုင် ရွေးချယ်တင်မည်</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Sample Demo Movies */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 font-burmese">
              <Film className="w-4 h-4 text-amber-400" />
              <span>သို့မဟုတ် စမ်းသပ်ရန် Demo Movie ရွေးချယ်ပါ:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SAMPLE_MOVIES.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => {
                    onSelectSampleMovie(movie);
                    onChangeStep(2);
                  }}
                  className="glass-panel p-3.5 rounded-2xl border border-white/10 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-16 h-12 rounded-xl bg-slate-950 overflow-hidden relative shrink-0 border border-white/10">
                    <img
                      src={movie.thumbnailUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                  </div>

                  <div className="truncate text-left">
                    <div className="font-bold text-xs text-white group-hover:text-amber-300 truncate">
                      {movie.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {movie.genre} &bull; {movie.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: SELECT BURMESE VOICE */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header & Filter Controls */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white font-burmese flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-amber-400" />
                <span>မြန်မာ AI အသံ ရွေးချယ်ပါ (40 Neural Burmese Voices)</span>
              </h3>
              <p className="text-xs text-slate-400 font-burmese mt-0.5">
                အမျိုးသား ၂၀ နှင့် အမျိုးသမီး ၂၀ ထဲမှ ကြိုက်နှစ်သက်ရာ အသံကို စမ်းနားထောင်ပြီး ရွေးချယ်ပါ
              </p>
            </div>

            {/* Gender Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/10">
              <button
                type="button"
                onClick={() => setVoiceTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  voiceTab === 'all' ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                အားလုံး (၄၀)
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('male')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  voiceTab === 'male' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                👨 အမျိုးသား (၂၀)
              </button>
              <button
                type="button"
                onClick={() => setVoiceTab('female')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  voiceTab === 'female' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                👩 အမျိုးသမီး (၂၀)
              </button>
            </div>
          </div>

          {/* 40 Burmese Voice Matrix Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredVoices.map((voice) => {
              const isSelected = voice.id === selectedVoiceId;
              const isAuditioning = isPlayingPreview && activePreviewingVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => onSelectVoice(voice.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/20 to-slate-900 border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/25 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Row: Avatar Badge & Audition Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow"
                          style={{ background: voice.avatarColor }}
                        >
                          {voice.code}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white font-burmese group-hover:text-amber-300">
                            {voice.nameBurmese}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {voice.nameEnglish}
                          </div>
                        </div>
                      </div>

                      {/* Audition Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAuditionVoice(voice);
                        }}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          isAuditioning
                            ? 'bg-amber-500 text-black shadow-lg animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                        }`}
                        title="စမ်းနားထောင်မည်"
                      >
                        {isAuditioning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Tone Category & Description */}
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-amber-300">
                        {voice.toneCategory}
                      </span>
                      <p className="text-[11px] text-slate-400 line-clamp-2 font-burmese leading-relaxed">
                        {voice.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom selection indicator */}
                  <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono">
                      {voice.gender === 'male' ? '👨 Male Neural' : '👩 Female Neural'}
                    </span>
                    {isSelected ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1 font-burmese text-xs">
                        <Check className="w-3.5 h-3.5" /> ရွေးချယ်ထားသည်
                      </span>
                    ) : (
                      <span className="text-slate-500 group-hover:text-slate-300 text-xs">
                        ရွေးမည် ▶
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChangeStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ပြန်သွားမည် (Back)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeStep(3);
                onStartFullGeneration();
              }}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-xl shadow-amber-500/25 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>ရုပ်ရှင်အနှစ်ချုပ် ဗီဒီယို ဖန်တီးမည် (Generate Recap Video) ▶</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: GENERATE & DOWNLOAD */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fadeIn">
          {isGenerating ? (
            /* Unified Processing State */
            <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-amber-500/30 text-center space-y-6 max-w-xl mx-auto shadow-2xl">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20 animate-spin">
                <RefreshCw className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white font-burmese">
                  ရုပ်ရှင်ဇာတ်လမ်းပြော ဗီဒီယို ဖန်တီးနေပါသည်...
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-burmese leading-relaxed">
                  {generationPhase}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Rendering Status</span>
                  <span className="text-amber-400 font-bold">{generationProgress}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-900 border border-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 transition-all duration-300 shadow-lg shadow-amber-500/50"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>

              {/* Sub-pipeline check stages */}
              <div className="grid grid-cols-2 gap-2 text-left text-xs text-slate-400 font-burmese pt-2">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>၁။ အသံဖိုင် စာသားထုတ်ယူခြင်း</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>၂။ မြန်မာ ရီကပ်ဘာသာပြန်ခြင်း</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>၃။ Neural Voiceover အသံသွင်းခြင်း</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>၄။ 1080p Video Render & Alignment</span>
                </div>
              </div>
            </div>
          ) : (
            /* Completed Video Player & Download Center */
            <div className="space-y-6">
              {/* Top Success Banner */}
              <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-burmese">
                      ရုပ်ရှင်အနှစ်ချုပ် ဗီဒီယို အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!
                    </h3>
                    <div className="text-xs text-slate-300 font-burmese">
                      အသံ- {selectedVoice.nameBurmese} ({selectedVoice.gender === 'male' ? 'အမျိုးသား' : 'အမျိုးသမီး'}) &bull; Resolution: 1080p HD &bull; Subtitles Burned-in
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onStartNewProject}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer font-burmese"
                  >
                    ဗီဒီယို အသစ်ထပ်လုပ်မည် (New)
                  </button>
                </div>
              </div>

              {/* Video Player & Subtitles Live Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Video Screen */}
                <div className="lg:col-span-2 glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 space-y-4 bg-slate-950/80">
                  <div className="relative rounded-2xl overflow-hidden aspect-video bg-black shadow-2xl border border-white/10 group">
                    {videoPreviewUrl ? (
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        No Video Preview
                      </div>
                    )}

                    {/* Subtitle burn-in preview overlay */}
                    <div className="absolute bottom-12 left-4 right-4 text-center pointer-events-none">
                      <span className="inline-block px-4 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-burmese shadow-2xl leading-relaxed">
                        {segments[0]?.myanmarText || 'ဒီတစ်ခါမှာတော့ စိတ်လှုပ်ရှားဖွယ် ရုပ်ရှင်ဇာတ်လမ်းကို စတင်တင်ဆက်ပေးပါမည်။'}
                      </span>
                    </div>
                  </div>

                  {/* Primary Download Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <a
                      href={videoPreviewUrl || '#'}
                      download={`${videoFileName.replace(/\.[^/.]+$/, '')}_recap_1080p.mp4`}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all text-center"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Video (.mp4)</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleDownloadSrt}
                      className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span>Download Subtitle (.srt)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPlayVoicePreview()}
                      className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>Play Voiceover Audio</span>
                    </button>
                  </div>
                </div>

                {/* Generated Burmese Script Column */}
                <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col h-[480px]">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="font-bold text-xs uppercase tracking-wider text-white font-burmese">
                      မြန်မာ ဇာတ်ကြောင်းပြော စာသားများ ({segments.length})
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      {selectedVoice.nameBurmese}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
                    {segments.map((seg, idx) => (
                      <div
                        key={seg.id || idx}
                        className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1 text-xs"
                      >
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                          <span>Scene {idx + 1}</span>
                          <span>{seg.start} - {seg.end}</span>
                        </div>
                        <div className="text-slate-200 font-burmese leading-relaxed">
                          {seg.myanmarText || seg.sourceText}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
