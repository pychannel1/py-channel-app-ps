import React from 'react';
import {
  Download,
  X,
  Film,
  Music,
  FileText,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Share2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TranscriptSegment } from '../types';

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoPreviewUrl: string | null;
  videoFileName: string;
  isRenderComplete: boolean;
  segments: TranscriptSegment[];
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({
  isOpen,
  onClose,
  videoPreviewUrl,
  videoFileName,
  isRenderComplete,
  segments,
}) => {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const handleDownloadVideo = () => {
    if (!videoPreviewUrl) return;
    const a = document.createElement('a');
    a.href = videoPreviewUrl;
    a.download = `recap_${videoFileName || 'video.mp4'}`;
    a.click();
  };

  const handleDownloadSubtitles = () => {
    const srtContent = segments
      .map((s, idx) => {
        return `${idx + 1}\n${s.start.replace('.', ',')} --> ${s.end.replace('.', ',')}\n${s.myanmarText || s.sourceText}\n`;
      })
      .join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadScript = () => {
    const fullText = segments
      .map((s, idx) => `[#${idx + 1} ${s.start} - ${s.end}]\nမြန်မာပြန်: ${s.myanmarText || ''}\n`)
      .join('\n');

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myanmar_recap_script_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>
                  {t.downloads}
                </span>
                {isRenderComplete && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Ready
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                {language === 'mm'
                  ? 'ထုတ်ယူပြီးသော ဗီဒီယို၊ အသံနှင့် စာတန်းထိုးဖိုင်များကို ဒေါင်းလုဒ်ရယူခြင်း'
                  : 'Download rendered recap videos, synthesized voice, and SRT subtitles'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-3">
          {/* Video Download Card */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-500/30 transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center flex-shrink-0">
                <Film className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {videoFileName || 'Recap_Movie_1080p.mp4'}
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'mm' ? '1080p HD Video Output (မြန်မာအသံနှင့် စာတန်းထိုး)' : '1080p HD Video with Myanmar Voice'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!videoPreviewUrl}
              onClick={handleDownloadVideo}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>{language === 'mm' ? 'ဗီဒီယို ရယူမည်' : 'Download Video'}</span>
            </button>
          </div>

          {/* Subtitles SRT Download Card */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-indigo-500/30 transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Burmese_Subtitles.srt
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'mm' ? 'ဗီဒီယိုနှင့် အချိန်ကိုက် မြန်မာစာတန်းထိုး ဖိုင်' : 'Timecoded SRT Subtitle File for CapCut / Premiere'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadSubtitles}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>{language === 'mm' ? 'SRT ရယူမည်' : 'Export SRT'}</span>
            </button>
          </div>

          {/* Script TXT Download Card */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-emerald-500/30 transition-all flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  Recap_Script_Burmese.txt
                </h4>
                <p className="text-xs text-slate-400">
                  {language === 'mm' ? 'ဇာတ်လမ်းပြော စာသား အပြည့်အစုံ' : 'Complete Myanmar Recap Script in Plain Text'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadScript}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'mm' ? 'Script ရယူမည်' : 'Export Script'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
