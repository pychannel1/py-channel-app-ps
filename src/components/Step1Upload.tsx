import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  RefreshCw,
  FileVideo,
  Clock,
  HardDrive,
  CheckCircle,
  Sparkles,
  Zap,
  Mic2,
  Layers,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface Step1UploadProps {
  videoPreviewUrl: string | null;
  videoDurationFormatted: string;
  videoDurationSeconds: number;
  videoFileName: string;
  isExtractingAudio: boolean;
  extractionProgress: number;
  assemblyApiKey?: string;
  onSaveAssemblyKey?: (key: string) => void;
  onFileUpload: (file: File) => void;
  onStartAudioExtraction: () => void;
  onChangeFile: () => void;
}

export const Step1Upload: React.FC<Step1UploadProps> = ({
  videoPreviewUrl,
  videoDurationFormatted,
  videoFileName,
  isExtractingAudio,
  extractionProgress,
  assemblyApiKey = '',
  onSaveAssemblyKey,
  onFileUpload,
  onStartAudioExtraction,
  onChangeFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Local AssemblyAI Key input state
  const [localKey, setLocalKey] = useState(assemblyApiKey);
  const [showKey, setShowKey] = useState(false);
  const [keyStatusMsg, setKeyStatusMsg] = useState('');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [missingKeyAlert, setMissingKeyAlert] = useState(false);

  const hasKey = Boolean(assemblyApiKey && assemblyApiKey.trim().length > 5);

  useEffect(() => {
    setLocalKey(assemblyApiKey);
    if (assemblyApiKey && assemblyApiKey.trim().length > 5) {
      setMissingKeyAlert(false);
    }
  }, [assemblyApiKey]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleSaveKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = localKey.trim();
    if (!clean) {
      setKeyStatusMsg('ကျေးဇူးပြု၍ AssemblyAI API Key ထည့်သွင်းပေးပါ');
      return;
    }
    if (onSaveAssemblyKey) {
      onSaveAssemblyKey(clean);
    }
    setKeyStatusMsg('✓ AssemblyAI Key သိမ်းဆည်းပြီးပါပြီ');
    setIsEditingKey(false);
    setMissingKeyAlert(false);
    setTimeout(() => setKeyStatusMsg(''), 3500);
  };

  const handleExtractClick = () => {
    setMissingKeyAlert(false);
    onStartAudioExtraction();
  };

  // Sample demo video loader for quick testing
  const handleLoadSampleVideo = async (sampleName: string) => {
    const sampleBlob = new Blob(['sample-video-content'], { type: 'video/mp4' });
    const sampleFile = new File([sampleBlob], `${sampleName}.mp4`, { type: 'video/mp4' });
    onFileUpload(sampleFile);
  };

  return (
    <div className="space-y-6">
      {/* Title & Burmese description */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold border border-amber-500/30">
                STEP 1
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Video တင်ပါ (Upload & Audio Extraction)
              </h2>
            </div>
            <p className="text-sm text-slate-300 font-burmese mt-1">
              Recap ပြုလုပ်မည့် Video ဖိုင်ကို ရွေးချယ်ပြီး အသံလှိုင်းမှ စာသားများကို သီးသန့် ထုတ်ယူပါမည်
            </p>
          </div>

          {videoPreviewUrl && (
            <button
              id="change-video-file-btn"
              type="button"
              onClick={onChangeFile}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold transition-all cursor-pointer shadow-md hover:border-amber-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-burmese">ဗီဒီယိုဖိုင် အသစ်ပြောင်းမည်</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Upload / Player Area */}
      {!videoPreviewUrl ? (
        <div className="space-y-6">
          {/* Main Dropzone Container */}
          <div
            id="video-dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-panel p-8 sm:p-14 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group min-h-[380px] ${
              isDragOver
                ? 'border-amber-400 bg-amber-950/30 scale-[1.01] shadow-2xl shadow-amber-500/20'
                : 'border-white/15 hover:border-amber-500/60 hover:bg-slate-900/70 shadow-xl'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/x-matroska,video/webm,video/quicktime,video/avi"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-5 group-hover:scale-110 group-hover:rotate-2 transition-transform shadow-xl shadow-amber-500/15">
              <Upload className="w-10 h-10" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Drop your Movie Clip here, or <span className="text-amber-400 underline decoration-amber-400/50 underline-offset-4">Browse File</span>
            </h3>
            <p className="text-sm text-slate-300 font-burmese max-w-md mb-6 leading-relaxed">
              MP4, MKV, MOV သို့မဟုတ် WEBM ဇာတ်ကားဖိုင်များကို ဖိဆွဲထည့်သွင်းနိုင်ပါသည်
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-white/10 font-mono">
                🎬 MP4 / MKV / MOV / WEBM
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-white/10 font-mono">
                ⚡ Auto Audio Demuxing
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-white/10 font-mono">
                🚀 Up to 1080p / 4K Clips
              </span>
            </div>
          </div>

          {/* Quick Demo Video Pickers */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-950/60">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-xs font-bold text-slate-300 font-burmese flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                အစမ်းလေ့လာရန် Sample Movie Clips ရွေးချယ်နိုင်သည် (၁၀ မိနစ်စာ English Audio ပါဝင်သည်)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleLoadSampleVideo('chronicles_10min_epic_scifi')}
                className="p-3.5 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 hover:border-amber-400 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/30 border border-amber-400/50 flex items-center justify-center text-amber-300 font-bold text-xs group-hover:scale-105 transition-transform flex-shrink-0">
                    ⏱️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                      10-Min Full Sci-Fi Epic
                    </div>
                    <div className="text-[11px] text-slate-300 font-burmese">
                      ကြာချိန်: ၁၀ မိနစ် • English Audio
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleLoadSampleVideo('action_heist_scene_1080p')}
                className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-amber-950/40 border border-white/10 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs group-hover:scale-105 transition-transform flex-shrink-0">
                    🎬
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Action Heist Scene
                    </div>
                    <div className="text-[11px] text-slate-400 font-burmese">
                      ကြာချိန်: 2 မိနစ် • English Audio
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleLoadSampleVideo('scifi_trailer_recap_4k')}
                className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-amber-950/40 border border-white/10 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs group-hover:scale-105 transition-transform flex-shrink-0">
                    🚀
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Sci-Fi Thriller Trailer
                    </div>
                    <div className="text-[11px] text-slate-400 font-burmese">
                      ကြာချိန်: 1.5 မိနစ် • English Audio
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Video Loaded & Transcription Engine Layout */
        <div className="space-y-6">
          {/* Video Preview Player Box */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl">
            <div className="relative aspect-video w-full max-h-[420px] bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoPreviewUrl || undefined}
                crossOrigin="anonymous"
                muted
                autoPlay={false}
                playsInline
                controls
                controlsList="nodownload nofullscreen noremoteplayback"
                onVolumeChange={(e) => {
                  // Force mute if user attempts unmuting via native shortcuts
                  const target = e.currentTarget;
                  if (!target.muted || target.volume > 0) {
                    target.muted = true;
                    target.volume = 0;
                  }
                }}
                className="w-full h-full object-contain pointer-events-auto"
              />
            </div>

            {/* Video Meta Information Footer */}
            <div className="p-4 bg-slate-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-100 truncate max-w-sm">
                    {videoFileName}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Clock className="w-3.5 h-3.5" /> Duration: {videoDurationFormatted}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <HardDrive className="w-3.5 h-3.5" /> Video Ready for Demuxing
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                  <CheckCircle className="w-3.5 h-3.5" /> Video Loaded
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Audio Extraction & Transcription Engine Card with BYOK AssemblyAI Setup */}
          {/* ========================================================================= */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-amber-500/30 bg-slate-950/90 shadow-2xl shadow-amber-500/10 space-y-6 relative overflow-hidden">
            {/* Subtle background glow accent */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            {/* Header & Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/25">
                  <Mic2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-burmese flex items-center gap-2">
                    <span>🎙️ Audio Extraction & Transcription Engine (ဗီဒီယိုမှ စာသားထုတ်ယူခြင်း)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
                    AssemblyAI Speech-to-Text & Timecode Processor
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-burmese leading-relaxed pt-2">
                ရွေးချယ်ထားသော ဗီဒီယိုမှ အသံလှိုင်းကို ခွဲထုတ်ပြီး AssemblyAI စနစ်ဖြင့် မူရင်းစကားပြောများကို အချိန်မှတ် (Timecode) ပါဝင်သော စာသားအဖြစ် ပြောင်းလဲပေးမည် ဖြစ်ပါသည်။
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-slate-900 border border-amber-500/25 text-amber-300 font-mono flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Fast Neural STT
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-900 border border-purple-500/25 text-purple-300 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Precise Millisecond Sync
                </span>
                <span className="px-3 py-1 rounded-lg bg-slate-900 border border-emerald-500/25 text-emerald-300 font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Auto Scene Segmentation
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* Bring-Your-Own-Key (BYOK) AssemblyAI Setup Box */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold text-white font-sans">
                    AssemblyAI API Key Setup
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                    [Local Storage]
                  </span>
                </div>

                {hasKey && !isEditingKey ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1 font-burmese">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Key အသင့်ရှိပါသည်
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingKey(true)}
                      className="text-xs text-slate-400 hover:text-amber-300 underline font-burmese cursor-pointer"
                    >
                      ပြင်ဆင်ရန်
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] font-medium text-amber-300 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1 font-burmese">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    Key ထည့်သွင်းရန် လိုအပ်ပါသည်
                  </span>
                )}
              </div>

              {/* Missing Key Warning Alert */}
              {missingKeyAlert && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center gap-2 text-red-200 text-xs font-burmese animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="font-semibold">
                    ကျေးဇူးပြု၍ သင်၏ AssemblyAI API Key ကို အရင် ထည့်သွင်းပေးပါ (အောက်ပါ Input တွင် ရိုက်ထည့်ပြီး Save Key နှိပ်ပါ)
                  </span>
                </div>
              )}

              {/* Key Input Box (Visible if no key or in editing mode) */}
              {(!hasKey || isEditingKey) && (
                <form onSubmit={handleSaveKey} className="space-y-2 pt-1">
                  <div className="relative">
                    <input
                      ref={keyInputRef}
                      id="step1-assembly-key-input"
                      type={showKey ? 'text' : 'password'}
                      value={localKey}
                      onChange={(e) => {
                        setLocalKey(e.target.value);
                        setMissingKeyAlert(false);
                      }}
                      placeholder="Enter your AssemblyAI API Key (e.g. 7f98d41...)"
                      className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 focus:border-amber-400 text-xs sm:text-sm font-mono text-amber-200 placeholder-slate-500 focus:outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <a
                      href="https://www.assemblyai.com/dashboard/signup"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 font-burmese"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>AssemblyAI Free Key ရယူရန် (Get Free Key) &rarr;</span>
                    </a>

                    <div className="flex items-center gap-2">
                      {isEditingKey && hasKey && (
                        <button
                          type="button"
                          onClick={() => setIsEditingKey(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 font-burmese"
                        >
                          မပြောင်းတော့ပါ
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Save Key</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {keyStatusMsg && (
                <p className="text-xs text-emerald-400 font-burmese flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{keyStatusMsg}</span>
                </p>
              )}

              <p className="text-[11px] text-slate-400 font-burmese">
                🔒 API Key ကို သင့် Browser ၏ LocalStorage ထဲတွင်သာ လုံခြုံစွာ သီးသန့် သိမ်းဆည်းပေးထားပါသည်။
              </p>
            </div>

            {/* Progress Bar when extracting */}
            {isExtractingAudio && (
              <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-inner animate-fadeIn">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-amber-300 font-mono flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    Extracting Audio & Transcribing Speech...
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-sm px-2.5 py-0.5 rounded-lg bg-amber-950/80 border border-amber-500/40">
                    {extractionProgress}%
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 rounded-full transition-all duration-300 shadow-lg shadow-amber-500/50"
                    style={{ width: `${extractionProgress}%` }}
                  />
                </div>

                <p className="text-xs text-slate-300 font-burmese flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  {extractionProgress < 35
                    ? 'ဗီဒီယိုမှ အသံလှိုင်း (Audio Track) ကို သီးသန့် ခွဲထုတ်နေပါသည်...'
                    : extractionProgress < 75
                    ? 'AssemblyAI STT စနစ်ဖြင့် မူရင်းစကားပြောများကို အချိန်မှတ်များနှင့်တကွ ရှာဖွေနေပါသည်...'
                    : 'စာသားများကို Step 2 သို့ လွှဲပြောင်းရန် အပြီးသတ် စီစဉ်နေပါသည်...'}
                </p>
              </div>
            )}

            {/* Glowing Prominent Action Button */}
            <div className="pt-2">
              <button
                id="step-1-extract-audio-btn"
                type="button"
                disabled={isExtractingAudio}
                onClick={handleExtractClick}
                className="w-full py-4 sm:py-4.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-slate-950 font-black text-base sm:text-lg tracking-wide shadow-2xl shadow-amber-500/40 border border-amber-300/60 flex items-center justify-center gap-3 cursor-pointer transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isExtractingAudio ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                    <span className="font-burmese">စာသားထုတ်ယူနေပါသည် ({extractionProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <span className="font-burmese">Step 1: စာသားထုတ်မည် ▶</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

