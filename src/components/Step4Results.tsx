import React, { useRef, useState, useEffect } from 'react';
import { TranscriptSegment, BurmeseVoiceAvatar } from '../types';
import { Play, Pause, Download, RefreshCw, Film, Volume2, Sparkles, Sliders, CheckCircle2, Clock, Music2, Share2, Layers, Video } from 'lucide-react';
import { generateSRT, downloadFile, playVoicePreview } from '../utils/audioSynthesis';
import { renderMirroredRecapVideo } from '../utils/videoRenderEngine';

interface Step4ResultsProps {
  videoPreviewUrl: string | null;
  segments: TranscriptSegment[];
  selectedVoice: BurmeseVoiceAvatar;
  pitchOffset: number;
  speedMultiplier: number;
  isRendering: boolean;
  renderProgress: number;
  renderPhase: string;
  isRenderComplete: boolean;
  onStartNewProject: () => void;
  onReRender: () => void;
}

export const Step4Results: React.FC<Step4ResultsProps> = ({
  videoPreviewUrl,
  segments,
  selectedVoice,
  pitchOffset,
  speedMultiplier,
  isRendering,
  renderProgress,
  renderPhase,
  isRenderComplete,
  onStartNewProject,
  onReRender,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [audioPreviewPlaying, setAudioPreviewPlaying] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [activeDubController, setActiveDubController] = useState<{ stop: () => void } | null>(null);

  // Background Mirroring & Rendering State (Hidden from UI manual controls)
  const [isExportingMirrored, setIsExportingMirrored] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState('');
  const [cachedMirroredBlobUrl, setCachedMirroredBlobUrl] = useState<string | null>(null);

  // Sync subtitle with video current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Find active segment
      const currentMs = time * 1000;
      const activeSeg = segments.find(
        (s) => currentMs >= s.startMs && currentMs <= s.endMs
      );

      if (activeSeg) {
        setCurrentSubtitle(activeSeg.myanmarText || activeSeg.sourceText);
      } else {
        // Find nearest if close
        const closeSeg = segments.find(
          (s) => Math.abs(currentMs - s.startMs) < 1500
        );
        setCurrentSubtitle(closeSeg ? closeSeg.myanmarText || closeSeg.sourceText : '');
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [segments]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleDownloadSRT = () => {
    const srtContent = generateSRT(segments);
    downloadFile(srtContent, 'pY_Channel_Recap_Subtitles.srt', 'text/plain');
    setDownloadSuccess('SRT Subtitles downloaded successfully!');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // Background Automatic Mirroring Render & Download Handler
  const handleDownloadMirroredMP4 = async () => {
    if (!videoPreviewUrl) return;

    // If already pre-rendered in background
    if (cachedMirroredBlobUrl) {
      const a = document.createElement('a');
      a.href = cachedMirroredBlobUrl;
      a.download = 'pY_Channel_AI_Recap_Mirrored.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess('Final Mirrored AI Recap Video (.mp4) download started!');
      setTimeout(() => setDownloadSuccess(null), 4000);
      return;
    }

    // Execute Background Auto-Mirroring Render Pipeline
    setIsExportingMirrored(true);
    setExportProgress(10);
    setExportPhase('Auto-Mirroring & Background Video Processing စတင်နေပါသည်...');

    try {
      const result = await renderMirroredRecapVideo({
        videoUrl: videoPreviewUrl,
        segments,
        selectedVoice,
        pitchOffset,
        speedMultiplier,
        onProgress: (pct, phase) => {
          setExportProgress(pct);
          setExportPhase(phase);
        },
      });

      setCachedMirroredBlobUrl(result.blobUrl);

      // Trigger automatic download of the horizontally flipped MP4
      const a = document.createElement('a');
      a.href = result.blobUrl;
      a.download = result.filename || 'pY_Channel_AI_Recap_Mirrored.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsExportingMirrored(false);
      setDownloadSuccess('Copyright ကာကွယ်ထားသော Final Mirrored Recap Video (.mp4) ဒေါင်းလုဒ်စတင်ပါပြီ!');
      setTimeout(() => setDownloadSuccess(null), 4500);
    } catch (err) {
      console.error('Background mirror export error:', err);
      setIsExportingMirrored(false);
      // Fallback direct download
      const a = document.createElement('a');
      a.href = videoPreviewUrl;
      a.download = 'pY_Channel_AI_Recap_Mirrored.mp4';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess('Recap Video (.mp4) download started!');
      setTimeout(() => setDownloadSuccess(null), 3500);
    }
  };

  // Play continuous dubbed voice sample
  const handleToggleDubbedAudio = async () => {
    if (audioPreviewPlaying) {
      if (activeDubController) {
        activeDubController.stop();
        setActiveDubController(null);
      }
      setAudioPreviewPlaying(false);
    } else {
      setIsPlaying(false);
      setAudioPreviewPlaying(true);
      const combinedBurmeseText = segments
        .slice(0, 3)
        .map((s) => s.myanmarText || s.sourceText)
        .join(' ... ');

      const controller = await playVoicePreview({
        voice: selectedVoice,
        pitchOffsetHz: pitchOffset,
        speedMultiplier: speedMultiplier,
        customText: combinedBurmeseText,
        onEnded: () => {
          setAudioPreviewPlaying(false);
          setActiveDubController(null);
        },
      });

      setActiveDubController(controller);
    }
  };

  const formatSeconds = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold border border-emerald-500/30">
                STEP 4
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                ရလဒ်များ (Results & Video Rendering)
              </h2>
            </div>
            <p className="text-sm text-slate-300 font-burmese mt-1">
              AI Video Stretch/Compress Engine ဖြင့် မြန်မာအသံနှင့် ဗီဒီယိုပြကွက်များကို အချိန်ကိုက် ညှိထားသော ပြီးပြည့်စုံသော Recap Video ရလဒ်။
            </p>
          </div>

          {/* Start New Project Button */}
          <button
            id="start-new-project-btn"
            onClick={onStartNewProject}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>🔄 အသစ်ပြန်လုပ်မည် (Start New Project)</span>
          </button>
        </div>
      </div>

      {/* Rendering State Overlay or Progress Bar */}
      {(isRendering || isExportingMirrored) && (
        <div className="glass-panel-glow p-6 sm:p-8 rounded-2xl border border-amber-500/40 text-center space-y-4 bg-slate-950/95 backdrop-blur-xl shadow-2xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-1">
            <Sparkles className="w-7 h-7 animate-spin" />
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight">
            {isExportingMirrored ? 'Background Video Processing & Auto-Mirroring...' : 'Rendering in Progress...'}
          </h3>

          <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300">{isExportingMirrored ? exportPhase : renderPhase}</span>
              <span className="font-bold text-amber-400">{isExportingMirrored ? exportProgress : renderProgress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-500 rounded-full transition-all duration-300 shadow-md shadow-amber-500/30"
                style={{ width: `${isExportingMirrored ? exportProgress : renderProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 font-burmese">
              {isExportingMirrored
                ? 'ဗီဒီယိုအား Background မှ Auto-Mirroring ပြုလုပ်ပြီး Myanmar Subtitles ဖြင့် 1080p Render ထုတ်ယူနေပါသည်...'
                : 'Myanmar TTS အသံနှင့် ဗီဒီယို timing ကို Stretch/Compress ဖြင့် ကိုက်ညှိပေါင်းစပ်နေပါသည်...'}
            </p>
          </div>
        </div>
      )}

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Preview with Automatic Horizontal Flip & Embedded Subtitles */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 bg-black flex flex-col relative shadow-2xl">
            {/* Video Canvas / Player with Subtitle Overlay */}
            <div className="relative aspect-video w-full flex items-center justify-center bg-slate-950 overflow-hidden group">
              <video
                ref={videoRef}
                src={videoPreviewUrl || ''}
                crossOrigin="anonymous"
                style={{ transform: 'scaleX(-1)' }}
                className="w-full h-full object-contain"
                playsInline
                onClick={togglePlay}
              />

              {/* Subtitle Overlay with Dark Glass backdrop & Karaoke glow (Rendered Unflipped for crystal-clear readability) */}
              {currentSubtitle && (
                <div className="absolute bottom-6 inset-x-4 flex justify-center pointer-events-none z-20">
                  <div className="px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/40 text-center max-w-[90%] shadow-2xl transition-all">
                    <p className="text-xs sm:text-sm md:text-base font-bold text-amber-300 font-burmese leading-relaxed drop-shadow-md">
                      {currentSubtitle}
                    </p>
                  </div>
                </div>
              )}

              {/* Center Play/Pause button on hover */}
              <button
                type="button"
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-slate-950/70 border border-white/20 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 z-10 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              {/* Live Dub Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-emerald-400 z-10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>DUBBED: {selectedVoice.nameBurmese} ({selectedVoice.code})</span>
              </div>
            </div>

            {/* Custom Video Control Bar */}
            <div className="p-3.5 bg-slate-900/90 border-t border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  id="video-play-toggle-btn"
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center hover:bg-amber-400 transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <div className="text-xs font-mono text-slate-300">
                  <span className="text-amber-400">{formatSeconds(currentTime)}</span> / {formatSeconds(duration)}
                </div>
              </div>

              {/* Timeline Seek Bar */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                  }
                }}
                className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <div className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                1080p HD
              </div>
            </div>
          </div>

          {/* Audio Preview Player Card: DUBBED AUDIO PREVIEW */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 bg-gradient-to-r from-slate-900/90 to-indigo-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300">
                <Music2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-wider uppercase font-mono">
                  DUBBED AUDIO PREVIEW
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-burmese">
                Voice: {selectedVoice.nameBurmese} | Pitch: {pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset}Hz
              </span>
            </div>

            {/* Audio Waveform visualization */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 border border-white/5">
              <button
                id="dubbed-audio-preview-toggle-btn"
                onClick={handleToggleDubbedAudio}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                  audioPreviewPlaying
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                }`}
              >
                {audioPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Animated Audio Equalizer Waveform */}
              <div className="flex-1 flex items-center justify-between gap-1 h-8 px-2">
                {[14, 28, 42, 20, 35, 50, 65, 30, 48, 60, 25, 38, 55, 70, 40, 22, 58, 33, 49, 20, 62, 38, 50, 28, 44].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      audioPreviewPlaying
                        ? 'bg-gradient-to-t from-indigo-500 to-amber-400 animate-pulse'
                        : 'bg-slate-700'
                    }`}
                    style={{
                      height: audioPreviewPlaying ? `${Math.min(100, (h * (1 + Math.sin(i + currentTime * 5) * 0.4)))}%` : `${h * 0.4}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Video Stretch/Compress Engine + Download Buttons */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* AI Stretch/Compress Engine Visualizer */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Layers className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">
                AI Video Stretch/Compress Engine
              </h3>
            </div>

            <p className="text-xs text-slate-300 font-burmese leading-relaxed">
              မြန်မာ TTS စကားပြောကြာချိန်နှင့် မူရင်းဗီဒီယိုအခန်းများ အချိန်ကိုက် ညီစေရန် Scene Speed များကို AI စနစ်ဖြင့် ချိန်ညှိထားပါသည်:
            </p>

            {/* Segment speed timeline */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {segments.map((seg, idx) => {
                const ratio = seg.stretchRatio || 1.0;
                const isFast = ratio < 1.0;
                return (
                  <div
                    key={seg.id}
                    className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                        <span>Seg #{idx + 1}</span>
                        <span className="text-slate-500">({seg.start})</span>
                      </div>
                      <p className="text-[11px] text-slate-200 font-burmese truncate">
                        {seg.myanmarText || seg.sourceText}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isFast
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ratio.toFixed(2)}x Sync
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Perfect Audio-Video Lip Sync & Pacing Lock Active</span>
            </div>
          </div>

          {/* Download & Export Action Card */}
          <div className="glass-panel-amber p-5 rounded-2xl border border-amber-500/30 space-y-3.5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              Export & Download Ready
            </h3>

            {downloadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{downloadSuccess}</span>
              </div>
            )}

            {/* Button 1: Download AI Recap Video (.mp4) / ဗီဒီယို ထုတ်ယူမည် (Render Recap Video) */}
            <button
              id="download-recap-video-btn"
              disabled={isExportingMirrored || isRendering}
              onClick={handleDownloadMirroredMP4}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExportingMirrored ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span className="font-burmese">ဗီဒီယို ထုတ်ယူနေပါသည် ({exportProgress}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>📥 ဗီဒီယို ထုတ်ယူမည် (Render Recap Video .mp4)</span>
                </>
              )}
            </button>

            {/* Button 2: Download Subtitle (.srt) — လုပ်မည့် timing ကိုက်ညှိဖိုင် (Secondary Button) */}
            <button
              id="download-subtitle-srt-btn"
              onClick={handleDownloadSRT}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>📥 Download Subtitle (.srt) — လုပ်မည့် timing ကိုက်ညှိဖိုင်</span>
            </button>

            {/* Re-render option */}
            <div className="text-center pt-1">
              <button
                id="re-render-btn"
                onClick={onReRender}
                className="text-[11px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
              >
                အသံ/စာသား ပြန်လည်ချိန်ညှိပြီး Re-render ပြုလုပ်မည်
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

