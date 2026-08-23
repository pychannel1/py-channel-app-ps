import React, { useRef, useState, useEffect } from 'react';
import { TranscriptSegment, BurmeseVoiceAvatar } from '../types';
import {
  Play,
  Pause,
  Download,
  RefreshCw,
  Sparkles,
  Music2,
  Layers,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { generateSRT, downloadFile, unlockAudioContext } from '../utils/audioSynthesis';
import { renderMirroredRecapVideo } from '../utils/videoRenderEngine';

interface Step4ResultsProps {
  videoPreviewUrl: string | null;
  generatedAudioBlob: Blob | null;
  generatedAudioBlobUrl: string | null;
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
  generatedAudioBlob,
  generatedAudioBlobUrl,
  segments,
  selectedVoice,
  pitchOffset,
  speedMultiplier,
  isRendering,
  renderProgress,
  renderPhase,
  onStartNewProject,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [audioPreviewPlaying, setAudioPreviewPlaying] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Background Mirroring & Rendering State
  const [isExportingMirrored, setIsExportingMirrored] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportPhase, setExportPhase] = useState('');
  const [cachedMirroredBlobUrl, setCachedMirroredBlobUrl] = useState<string | null>(null);

  // Initialize Video and Audio elements with volume 1.0 and unmuted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 1.0;
      videoRef.current.muted = false;
      videoRef.current.defaultMuted = false;
    }
    if (audioRef.current) {
      audioRef.current.volume = 1.0;
      audioRef.current.muted = false;
      audioRef.current.defaultMuted = false;
      audioRef.current.load();
    }
  }, [generatedAudioBlobUrl, videoPreviewUrl]);

  // Sync subtitle and audio with video current time
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
        const closeSeg = segments.find(
          (s) => Math.abs(currentMs - s.startMs) < 1500
        );
        setCurrentSubtitle(closeSeg ? closeSeg.myanmarText || closeSeg.sourceText : '');
      }

      // Keep audio synchronized with video
      if (audioRef.current && !audioRef.current.paused) {
        const diff = Math.abs(audioRef.current.currentTime - time);
        if (diff > 0.3) {
          audioRef.current.currentTime = time;
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handlePlay = async () => {
      setIsPlaying(true);
      setPlaybackError(null);
      await unlockAudioContext();
      // Synchronously play Burmese Dubbed Audio with video
      if (audioRef.current && generatedAudioBlobUrl) {
        try {
          audioRef.current.currentTime = video.currentTime;
          audioRef.current.volume = 1.0;
          audioRef.current.muted = false;
          await audioRef.current.play();
        } catch (err: any) {
          console.warn('Audio sync playback notice:', err);
          if (err?.name === 'NotAllowedError') {
            setPlaybackError('Browser autoplay restricted. Tap "Play Dubbed Audio" below to hear sound.');
          }
        }
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [segments, generatedAudioBlobUrl]);

  // Video Play/Pause controller with user gesture audio unlock
  const togglePlay = async () => {
    setPlaybackError(null);
    await unlockAudioContext();

    if (videoRef.current) {
      try {
        if (videoRef.current.paused) {
          videoRef.current.volume = 1.0;
          videoRef.current.muted = false;
          await videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      } catch (err: any) {
        console.error('Video/Audio playback error:', err);
        setPlaybackError('Browser playback restricted. Click Play to start.');
      }
    }
  };

  // Dubbed Audio Play/Pause controller
  const handleToggleDubbedAudio = async () => {
    setPlaybackError(null);
    await unlockAudioContext();

    if (!audioRef.current) return;

    if (audioPreviewPlaying) {
      audioRef.current.pause();
      setAudioPreviewPlaying(false);
    } else {
      try {
        audioRef.current.volume = 1.0;
        audioRef.current.muted = false;
        audioRef.current.playbackRate = Math.max(0.5, Math.min(2.0, speedMultiplier || 1.0));
        await audioRef.current.play();
        setAudioPreviewPlaying(true);
      } catch (err: any) {
        console.error('Audio playback failed:', err);
        setPlaybackError('Audio autoplay restricted. Tap Play button again to listen.');
        setAudioPreviewPlaying(false);
      }
    }
  };

  const handleDownloadSRT = () => {
    const srtContent = generateSRT(segments);
    downloadFile(srtContent, 'pY_Channel_Recap_Subtitles.srt', 'text/plain');
    setDownloadSuccess('SRT Subtitles downloaded successfully!');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleDownloadAudioMP3 = () => {
    if (!generatedAudioBlobUrl) return;
    const a = document.createElement('a');
    a.href = generatedAudioBlobUrl;
    a.download = `pY_Channel_${selectedVoice.code || 'Burmese_Dubbed'}_Audio.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadSuccess('Burmese Dubbed Voice Audio (.mp3) downloaded successfully!');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // Background Automatic Mirroring Render & Download Handler with embedded Audio Track
  const handleDownloadMirroredMP4 = async () => {
    if (!videoPreviewUrl) return;

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
        audioBlob: generatedAudioBlob,
        audioBlobUrl: generatedAudioBlobUrl,
        onProgress: (pct, phase) => {
          setExportProgress(pct);
          setExportPhase(phase);
        },
      });

      setCachedMirroredBlobUrl(result.blobUrl);

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

      {/* Playback Error Notice */}
      {playbackError && (
        <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center justify-between gap-3 text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{playbackError}</span>
          </div>
          <button
            type="button"
            onClick={togglePlay}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Tap Play
          </button>
        </div>
      )}

      {/* Download Success Notice */}
      {downloadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs font-medium animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Rendering State Overlay */}
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
                src={videoPreviewUrl || undefined}
                crossOrigin="anonymous"
                style={{ transform: 'scaleX(-1)' }}
                className="w-full h-full object-contain"
                playsInline
                preload="auto"
                onClick={togglePlay}
              />

              {/* Synchronized Dubbed Audio Element */}
              <audio
                ref={audioRef}
                src={generatedAudioBlobUrl || selectedVoice?.audioUrl || (selectedVoice?.id ? `/api/voice-audio/${selectedVoice.id}` : undefined)}
                crossOrigin="anonymous"
                playsInline
                preload="auto"
                onPlay={() => setAudioPreviewPlaying(true)}
                onPause={() => setAudioPreviewPlaying(false)}
                onEnded={() => setAudioPreviewPlaying(false)}
                onError={async (e) => {
                  console.warn('Dubbed audio element load notice:', e);
                  if (audioRef.current && selectedVoice?.id) {
                    const fallbackEndpoint = selectedVoice.audioUrl || `/api/voice-audio/${selectedVoice.id}`;
                    if (!audioRef.current.src.includes(fallbackEndpoint)) {
                      audioRef.current.src = fallbackEndpoint;
                      audioRef.current.load();
                      return;
                    }
                  }
                  setPlaybackError('Audio playback notice. Tap Play Dubbed Audio below to listen.');
                  setAudioPreviewPlaying(false);
                }}
              />

              {/* Subtitle Overlay with Dark Glass backdrop & Karaoke glow */}
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
                  className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center hover:bg-amber-400 transition-all cursor-pointer shadow-md"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
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
                  if (audioRef.current) {
                    audioRef.current.currentTime = val;
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

            {/* Audio Waveform visualization + Control */}
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
                {audioPreviewPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
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
                      height: audioPreviewPlaying
                        ? `${Math.min(100, h * (1 + Math.sin(i + currentTime * 5) * 0.4))}%`
                        : `${h * 0.4}%`,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-mono">
                <Volume2 className="w-3.5 h-3.5" />
                <span>100%</span>
              </div>
            </div>

            {/* Native HTML5 Audio Controls for maximum mobile accessibility */}
            {generatedAudioBlobUrl && (
              <div className="pt-1">
                <audio
                  controls
                  playsInline
                  preload="auto"
                  src={generatedAudioBlobUrl}
                  className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            )}
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
                        {isFast ? `Speed: ${ratio.toFixed(2)}x` : `Stretch: ${ratio.toFixed(2)}x`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export & Download Action Buttons */}
          <div className="space-y-3 pt-2">
            {/* Automatic Mirrored 1080p MP4 Download Button */}
            <button
              id="download-mirrored-mp4-btn"
              onClick={handleDownloadMirroredMP4}
              disabled={isExportingMirrored || isRendering}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black text-sm font-bold shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isExportingMirrored
                  ? 'Rendering Mirrored MP4 Video...'
                  : '🎥 Download Final Mirrored Video (.mp4)'}
              </span>
            </button>

            {/* Download Burmese Dubbed Audio (.mp3) Button */}
            {generatedAudioBlobUrl && (
              <button
                id="download-dubbed-audio-mp3-btn"
                onClick={handleDownloadAudioMP3}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer shadow-md shadow-indigo-950/40"
              >
                <Music2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>🎵 Download Burmese Dubbed Audio (.mp3)</span>
              </button>
            )}

            {/* Download SRT Subtitles Button */}
            <button
              id="download-srt-btn"
              onClick={handleDownloadSRT}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download SRT Subtitles (.srt)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
